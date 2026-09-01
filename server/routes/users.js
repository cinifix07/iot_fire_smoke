const express = require("express");

const router = express.Router();
const db = require("../database");
const { hashPassword } = require("../auth-utils");

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
      SELECT id, name, email, role, status, created_at, updated_at
      FROM users
      ORDER BY created_at DESC NULLS LAST, id DESC
      LIMIT $1
      `,
      [limit]
    );

    res.json({
      status: "success",
      data: result.rows,
    });
  } catch (error) {
    console.error("Users GET error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch users",
    });
  }
});

router.post("/", async (req, res) => {
  const { name, email, password, role = "user", status = "active" } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({
      status: "error",
      message: "name, email, and password are required",
    });
  }

  try {
    const passwordHash = hashPassword(password);
    const result = await db.query(
      `
      INSERT INTO users (name, email, password, role, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, role, status, created_at, updated_at
      `,
      [String(name).trim(), String(email).trim().toLowerCase(), passwordHash, role, status]
    );

    res.status(201).json({
      status: "success",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Users POST error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to create user",
    });
  }
});

module.exports = router;
