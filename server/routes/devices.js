const express = require("express");

const router = express.Router();
const db = require("../database");

function parseLimit(value, fallback = 50, max = 200) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, 1), max);
}

router.get("/", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const result = await db.query(
      `
      SELECT id, location_id, device_code, device_name, ip_address, status, last_seen_at
      FROM devices
      ORDER BY last_seen_at DESC NULLS LAST, id DESC
      LIMIT $1
      `,
      [limit]
    );

    res.json({
      status: "success",
      data: result.rows,
    });
  } catch (error) {
    console.error("Devices GET error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch devices",
    });
  }
});

router.post("/", async (req, res) => {
  const { location_id, device_code, device_name, ip_address, status = "active" } = req.body || {};

  if (!location_id || !device_code || !device_name) {
    return res.status(400).json({
      status: "error",
      message: "location_id, device_code, and device_name are required",
    });
  }

  try {
    const result = await db.query(
      `
      INSERT INTO devices (
        location_id,
        device_code,
        device_name,
        ip_address,
        status,
        last_seen_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, location_id, device_code, device_name, ip_address, status, last_seen_at
      `,
      [Number(location_id), String(device_code).trim(), String(device_name).trim(), ip_address || null, status]
    );

    res.status(201).json({
      status: "success",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Devices POST error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to create device",
    });
  }
});

module.exports = router;
