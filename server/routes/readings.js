const express = require("express");

const router = express.Router();
const db = require("../database");
const { publish } = require("../live-stream");

function parseLimit(value, fallback = 50, max = 200) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, 1), max);
}

function parseBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  return false;
}

function normalizeOptionalNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getFireStatus(smokeLevel, temperature, flameDetected) {
  if (flameDetected) {
    return "CRITICAL";
  }

  if (smokeLevel >= 1500 || temperature >= 50) {
    return "WARNING";
  }

  return "NORMAL";
}

function buildFireDescription(fireStatus, smokeLevel, temperature, flameDetected) {
  const flameLabel = flameDetected ? "detected" : "not detected";
  if (fireStatus === "CRITICAL") {
    return `Fire detected: smoke ${smokeLevel}, temperature ${temperature} C, flame ${flameLabel}.`;
  }

  if (fireStatus === "WARNING") {
    return `Warning: smoke ${smokeLevel}, temperature ${temperature} C, flame ${flameLabel}.`;
  }

  return "System returned to normal conditions.";
}

async function ensureReadingTargets(client, deviceId, sensorId) {
  await client.query(
    `
    INSERT INTO locations (
      id,
      name,
      building,
      floor,
      room,
      description,
      status
    )
    VALUES ($1, $2, NULL, NULL, NULL, $3, 'active')
    ON CONFLICT (id) DO NOTHING
    `,
    [
      1,
      "Wokwi Fire Monitor Lab",
      "Auto-seeded location for the Wokwi ESP32 DevKit V1 simulation",
    ]
  );

  await client.query(
    `
    INSERT INTO devices (
      id,
      location_id,
      device_code,
      device_name,
      ip_address,
      status,
      last_seen_at
    )
    VALUES ($1, $4, $2, $3, NULL, 'active', NOW())
    ON CONFLICT (id) DO UPDATE SET
      location_id = EXCLUDED.location_id,
      device_code = EXCLUDED.device_code,
      device_name = EXCLUDED.device_name,
      last_seen_at = NOW(),
      status = EXCLUDED.status
    `,
    [
      deviceId,
      "wokwi-esp32-devkit-v1",
      "Wokwi ESP32 DevKit V1",
      1,
    ]
  );

  await client.query(
    `
    INSERT INTO sensors (
      id,
      device_id,
      sensor_type,
      sensor_name,
      pin_number,
      status
    )
    VALUES ($1, $2, $3, $4, $5, 'active')
    ON CONFLICT (id) DO NOTHING
    `,
    [
      sensorId,
      deviceId,
      "MQ-2",
      "MQ-2 Gas Sensor",
      34,
    ]
  );
}

async function resolveNotificationUserId(client) {
  const result = await client.query(
    `
    SELECT id
    FROM users
    WHERE role = 'admin'
    ORDER BY id ASC
    LIMIT 1
    `
  );

  return result.rows[0]?.id ?? null;
}

router.get("/", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const result = await db.query(
      `
      SELECT
        sr.id,
        sr.device_id,
        sr.sensor_id,
        d.device_name,
        d.device_code,
        s.sensor_name,
        s.sensor_type,
        sr.smoke_level,
        sr.temperature,
        sr.humidity,
        sr.flame_detected,
        sr.recorded_at
      FROM sensor_readings sr
      LEFT JOIN devices d ON d.id = sr.device_id
      LEFT JOIN sensors s ON s.id = sr.sensor_id
      ORDER BY recorded_at DESC, id DESC
      LIMIT $1
      `,
      [limit]
    );

    res.json({
      status: "success",
      data: result.rows,
    });
  } catch (error) {
    console.error("Readings GET error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch sensor readings",
    });
  }
});

router.post("/", async (req, res) => {
  const {
    device_id,
    sensor_id,
    smoke_level,
    temperature,
    humidity,
    flame_detected,
    fire_status,
  } = req.body || {};

  const missingFields = [];
  if (device_id === undefined || device_id === null || device_id === "") missingFields.push("device_id");
  if (sensor_id === undefined || sensor_id === null || sensor_id === "") missingFields.push("sensor_id");
  if (smoke_level === undefined || smoke_level === null || smoke_level === "") missingFields.push("smoke_level");
  if (temperature === undefined || temperature === null || temperature === "") missingFields.push("temperature");
  if (flame_detected === undefined || flame_detected === null || flame_detected === "") missingFields.push("flame_detected");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: "error",
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  const deviceId = Number(device_id);
  const sensorId = Number(sensor_id);
  const smokeLevel = Number(smoke_level);
  const temperatureValue = Number(temperature);
  const humidityValue = normalizeOptionalNumber(humidity);
  const flameDetected = parseBoolean(flame_detected);
  const reportedFireStatus = fire_status ? String(fire_status).toUpperCase() : null;
  const computedFireStatus = getFireStatus(smokeLevel, temperatureValue, flameDetected);
  const fireStatus = computedFireStatus;

  if (
    [deviceId, sensorId].some((value) => !Number.isInteger(value) || value <= 0) ||
    [smokeLevel, temperatureValue].some((value) => Number.isNaN(value)) ||
    (humidity !== undefined && humidity !== null && humidity !== "" && humidityValue === null)
  ) {
    return res.status(400).json({
      status: "error",
      message: "device_id and sensor_id must be positive integers, smoke_level and temperature must be valid numbers, and humidity must be numeric when provided",
    });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");
    await ensureReadingTargets(client, deviceId, sensorId);

    const readingResult = await client.query(
      `
      INSERT INTO sensor_readings (
        device_id,
        sensor_id,
        smoke_level,
        temperature,
        humidity,
        flame_detected
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, device_id, sensor_id, smoke_level, temperature, humidity, flame_detected, recorded_at
      `,
      [deviceId, sensorId, smokeLevel, temperatureValue, humidityValue, flameDetected]
    );

    const reading = readingResult.rows[0];
    let fireEvent = null;
    let alarm = null;
    let notification = null;

    if (fireStatus !== "CRITICAL") {
      await client.query(
        `
        UPDATE fire_events
        SET status = 'resolved', resolved_at = NOW()
        WHERE device_id = $1
          AND UPPER(severity) = 'CRITICAL'
          AND LOWER(status) = 'active'
        `,
        [deviceId]
      );

      await client.query(
        `
        UPDATE alarms
        SET
          status = 'resolved',
          deactivated_at = NOW(),
          duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - activated_at))::int)
        WHERE device_id = $1 AND LOWER(status) = 'active'
        `,
        [deviceId]
      );
    }

    if (fireStatus !== "NORMAL") {
      const fireEventResult = await client.query(
        `
        INSERT INTO fire_events (
          device_id,
          sensor_reading_id,
          event_type,
          severity,
          description,
          status,
          detected_at
        )
        VALUES ($1, $2, $3, $4, $5, 'active', NOW())
        RETURNING id, device_id, sensor_reading_id, event_type, severity, description, status, detected_at
        `,
        [
          deviceId,
          reading.id,
          fireStatus === "CRITICAL" ? "FIRE_DETECTED" : "FIRE_WARNING",
          fireStatus,
          buildFireDescription(fireStatus, smokeLevel, temperatureValue, flameDetected),
        ]
      );

      fireEvent = {
        ...fireEventResult.rows[0],
        reading_id: fireEventResult.rows[0].sensor_reading_id,
      };

      if (fireStatus === "CRITICAL") {
        const alarmResult = await client.query(
          `
          INSERT INTO alarms (
            fire_event_id,
            device_id,
            alarm_type,
            buzzer_active,
            led_active,
            status,
            duration_seconds,
            activated_at
          )
          VALUES ($1, $2, $3, TRUE, TRUE, 'active', 0, NOW())
          RETURNING id, fire_event_id, device_id, alarm_type, buzzer_active, led_active, status, duration_seconds, activated_at
          `,
          [
            fireEvent.id,
            deviceId,
            "BUZZER_LED",
          ]
        );

        alarm = {
          ...alarmResult.rows[0],
          event_id: alarmResult.rows[0].fire_event_id,
        };

        const notificationUserId = await resolveNotificationUserId(client);
        if (notificationUserId) {
          const notificationResult = await client.query(
            `
            INSERT INTO notifications (
              user_id,
              fire_event_id,
              title,
              message,
              notification_type,
              status,
              sent_at
            )
            VALUES ($1, $2, $3, $4, 'fire_alert', 'unread', NOW())
            RETURNING id, user_id, fire_event_id, title, message, notification_type, status, sent_at, read_at
            `,
            [
              notificationUserId,
              fireEvent.id,
              "Fire detected",
              buildFireDescription(fireStatus, smokeLevel, temperatureValue, flameDetected),
            ]
          );

          notification = {
            ...notificationResult.rows[0],
            event_id: notificationResult.rows[0].fire_event_id,
          };
        }
      }
    } else {
      await client.query(
        `
        UPDATE fire_events
        SET status = 'resolved', resolved_at = NOW()
        WHERE device_id = $1 AND LOWER(status) = 'active'
        `,
        [deviceId]
      );

      await client.query(
        `
        UPDATE alarms
        SET
          status = 'resolved',
          deactivated_at = NOW(),
          duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - activated_at))::int)
        WHERE device_id = $1 AND LOWER(status) = 'active'
        `,
        [deviceId]
      );
    }

    await client.query(
      `
      UPDATE devices
      SET last_seen_at = NOW()
      WHERE id = $1
      `,
      [deviceId]
    );

    await client.query("COMMIT");

    const responseData = {
      ...reading,
      fire_status: fireStatus,
      reported_fire_status: reportedFireStatus,
      fire_event: fireEvent,
      alarm,
      notification,
    };

    console.log(
      `[READING] Stored id=${reading.id} device=${deviceId} smoke=${smokeLevel} temp=${temperatureValue} humidity=${humidityValue ?? "n/a"} flame=${flameDetected} status=${fireStatus}`
    );

    res.status(201).json({
      status: "success",
      message: "Sensor data stored",
      data: responseData,
    });

    publish("dashboard-update", {
      type: "reading",
      data: responseData,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Readings POST error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to store sensor reading",
    });
  } finally {
    client.release();
  }
});

module.exports = router;
