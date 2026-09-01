const express = require("express");

const router = express.Router();
const db = require("../database");
const { verifyPassword } = require("../auth-utils");

router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      status: "error",
      message: "username and password are required",
    });
  }

  try {
    const result = await db.query(
      `
      SELECT id, name, email, password, role, status
      FROM users
      WHERE LOWER(email) = LOWER($1)
         OR LOWER(name) = LOWER($1)
      LIMIT 1
      `,
      [String(username).trim()]
    );

    const user = result.rows[0];

    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({
        status: "error",
        message: "Invalid username or password.",
      });
    }

    res.json({
      status: "success",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to authenticate user",
    });
  }
});

module.exports = router;
