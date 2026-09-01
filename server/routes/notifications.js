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
    const status = req.query.status ? String(req.query.status).trim() : null;

    const result = status
      ? await db.query(
          `
          SELECT
            id,
            user_id,
            fire_event_id AS event_id,
            title,
            message,
            notification_type,
            status,
            sent_at,
            read_at
          FROM notifications
          WHERE status = $1
          ORDER BY sent_at DESC, id DESC
          LIMIT $2
          `,
          [status, limit]
        )
      : await db.query(
          `
          SELECT
            id,
            user_id,
            fire_event_id AS event_id,
            title,
            message,
            notification_type,
            status,
            sent_at,
            read_at
          FROM notifications
          ORDER BY sent_at DESC, id DESC
          LIMIT $1
          `,
          [limit]
        );

    res.json({
      status: "success",
      data: result.rows,
    });
  } catch (error) {
    console.error("Notifications GET error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch notifications",
    });
  }
});

router.post("/", async (req, res) => {
  const {
    user_id,
    fire_event_id,
    event_id,
    title,
    message,
    notification_type = "fire_alert",
    status = "unread",
  } = req.body || {};
  const resolvedEventId = fire_event_id ?? event_id;

  const missingFields = [];
  if (user_id === undefined || user_id === null || user_id === "") missingFields.push("user_id");
  if (resolvedEventId === undefined || resolvedEventId === null || resolvedEventId === "") missingFields.push("fire_event_id");
  if (!title) missingFields.push("title");
  if (!message) missingFields.push("message");

  if (missingFields.length > 0) {
    return res.status(400).json({
      status: "error",
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  try {
    const result = await db.query(
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
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, user_id, fire_event_id, title, message, notification_type, status, sent_at, read_at
      `,
      [
        Number(user_id),
        Number(resolvedEventId),
        String(title).trim(),
        String(message).trim(),
        String(notification_type).trim(),
        String(status).trim(),
      ]
    );

    res.status(201).json({
      status: "success",
      data: {
        ...result.rows[0],
        event_id: result.rows[0].fire_event_id,
      },
    });
  } catch (error) {
    console.error("Notifications POST error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to create notification",
    });
  }
});

module.exports = router;
