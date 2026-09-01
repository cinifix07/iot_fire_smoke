const express = require("express");

const router = express.Router();
const db = require("../database");
const { subscribe } = require("../live-stream");

router.get("/live", (req, res) => {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  subscribe(req, res);
});

router.get("/status", async (req, res) => {
  try {
    const [readingResult, alarmResult, notificationResult, eventResult] = await Promise.all([
      db.query(
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
        ORDER BY recorded_at DESC
        LIMIT 1
        `
      ),
      db.query(
        `
        SELECT COUNT(*)::int AS active_alarm_count
        FROM alarms
        WHERE LOWER(status) = 'active'
        `
      ),
      db.query(
        `
        SELECT COUNT(*)::int AS unread_notification_count
        FROM notifications
        WHERE status = 'unread'
        `
      ),
      db.query(
        `
        SELECT
          id,
          device_id,
          sensor_reading_id AS reading_id,
          event_type,
          severity,
          description,
          status,
          detected_at
        FROM fire_events
        ORDER BY detected_at DESC
        LIMIT 1
        `
      ),
    ]);

    const latestReading = readingResult.rows[0] || null;
    const latestEvent = eventResult.rows[0] || null;
    const smokeLevel = latestReading ? Number(latestReading.smoke_level) : null;
    const temperature = latestReading ? Number(latestReading.temperature) : null;
    const humidity = latestReading?.humidity !== null && latestReading?.humidity !== undefined ? Number(latestReading.humidity) : null;
    const flameDetected = latestReading ? Boolean(latestReading.flame_detected) : false;

    let fireStatus = "NO_DATA";
    if (flameDetected) {
      fireStatus = "CRITICAL";
    } else if ((smokeLevel !== null && smokeLevel >= 1500) || (temperature !== null && temperature >= 50)) {
      fireStatus = "WARNING";
    } else if (latestReading) {
      fireStatus = "NORMAL";
    }

    res.json({
      status: "success",
      data: {
        fire_status: fireStatus,
        latest_smoke: smokeLevel,
        latest_temperature: temperature,
        latest_humidity: humidity,
        flame_status: flameDetected,
        active_alarms: alarmResult.rows[0]?.active_alarm_count ?? 0,
        unread_notifications: notificationResult.rows[0]?.unread_notification_count ?? 0,
        latest_reading: latestReading,
        latest_fire_event: latestEvent,
      },
    });
  } catch (error) {
    console.error("Dashboard status error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to load dashboard status",
    });
  }
});

router.get("/history", async (req, res) => {
  try {
    const [eventResult, alarmResult, readingResult] = await Promise.all([
      db.query(
        `
        SELECT
          id,
          device_id,
          sensor_reading_id AS reading_id,
          event_type,
          severity,
          description,
          status,
          detected_at
        FROM fire_events
        ORDER BY detected_at DESC
        LIMIT 20
        `
      ),
      db.query(
        `
        SELECT
          id,
          fire_event_id AS event_id,
          device_id,
          alarm_type,
          status,
          duration_seconds,
          activated_at
        FROM alarms
        ORDER BY activated_at DESC
        LIMIT 20
        `
      ),
      db.query(
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
        ORDER BY recorded_at DESC
        LIMIT 20
        `
      ),
    ]);

    res.json({
      status: "success",
      data: {
        recent_fire_events: eventResult.rows,
        alarm_history: alarmResult.rows,
        sensor_trends: readingResult.rows,
      },
    });
  } catch (error) {
    console.error("Dashboard history error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to load dashboard history",
    });
  }
});

module.exports = router;
