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

function parsePage(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 1 : Math.max(parsed, 1);
}

router.get("/", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const page = parsePage(req.query.page);
    const offset = (page - 1) * limit;
    const severity = req.query.severity ? String(req.query.severity).trim().toUpperCase() : null;
    const [result, countResult] = await Promise.all([
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
        WHERE ($1::text IS NULL OR UPPER(severity) = $1)
        ORDER BY detected_at DESC, id DESC
        LIMIT $2
        OFFSET $3
        `,
        [severity, limit, offset]
      ),
      db.query(
        `
        SELECT COUNT(*)::int AS total
        FROM fire_events
        WHERE ($1::text IS NULL OR UPPER(severity) = $1)
        `,
        [severity]
      ),
    ]);

    const totalItems = countResult.rows[0]?.total ?? 0;

    res.json({
      status: "success",
      data: result.rows,
      pagination: {
        page,
        pageSize: limit,
        totalItems,
        totalPages: Math.max(Math.ceil(totalItems / limit), 1),
      },
    });
  } catch (error) {
    console.error("Fire events GET error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch fire events",
    });
  }
});

router.post("/", async (req, res) => {
  const {
    device_id,
    sensor_reading_id,
    reading_id,
    event_type,
    severity = "HIGH",
    description = null,
    status = "active",
  } =
    req.body || {};
  const resolvedReadingId = sensor_reading_id ?? reading_id;

  const missingFields = [];
  if (device_id === undefined || device_id === null || device_id === "") missingFields.push("device_id");
  if (resolvedReadingId === undefined || resolvedReadingId === null || resolvedReadingId === "") missingFields.push("sensor_reading_id");
  if (!event_type) missingFields.push("event_type");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: "error",
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  try {
    const result = await db.query(
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
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, device_id, sensor_reading_id, event_type, severity, description, status, detected_at
      `,
      [
        Number(device_id),
        Number(resolvedReadingId),
        String(event_type).trim(),
        String(severity).trim(),
        description,
        String(status).trim(),
      ]
    );

    res.status(201).json({
      status: "success",
      data: {
        ...result.rows[0],
        reading_id: result.rows[0].sensor_reading_id,
      },
    });

    publish("dashboard-update", {
      type: "fire-event",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Fire events POST error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to create fire event",
    });
  }
});

module.exports = router;
