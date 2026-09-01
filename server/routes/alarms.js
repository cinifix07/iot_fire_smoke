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

router.get("/", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const result = await db.query(
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
      ORDER BY activated_at DESC, id DESC
      LIMIT $1
      `,
      [limit]
    );

    res.json({
      status: "success",
      data: result.rows,
    });
  } catch (error) {
    console.error("Alarms GET error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch alarms",
    });
  }
});

router.post("/", async (req, res) => {
  const {
    fire_event_id,
    event_id,
    device_id,
    alarm_type = "fire_alarm",
    status = "active",
    duration_seconds = 0,
  } = req.body || {};
  const resolvedEventId = fire_event_id ?? event_id;

  const missingFields = [];
  if (resolvedEventId === undefined || resolvedEventId === null || resolvedEventId === "") missingFields.push("fire_event_id");
  if (device_id === undefined || device_id === null || device_id === "") missingFields.push("device_id");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: "error",
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  try {
    const result = await db.query(
      `
      INSERT INTO alarms (
        fire_event_id,
        device_id,
        alarm_type,
        status,
        duration_seconds,
        activated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, fire_event_id, device_id, alarm_type, status, duration_seconds, activated_at
      `,
      [
        Number(resolvedEventId),
        Number(device_id),
        String(alarm_type).trim(),
        String(status).trim(),
        Number(duration_seconds) || 0,
      ]
    );

    res.status(201).json({
      status: "success",
      data: {
        ...result.rows[0],
        event_id: result.rows[0].fire_event_id,
      },
    });

    publish("dashboard-update", {
      type: "alarm",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Alarms POST error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to create alarm record",
    });
  }
});

module.exports = router;
