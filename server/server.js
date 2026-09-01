const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./database");

const readingsRouter = require("./routes/readings");
const fireEventsRouter = require("./routes/fireEvents");
const alarmsRouter = require("./routes/alarms");
const notificationsRouter = require("./routes/notifications");
const devicesRouter = require("./routes/devices");
const usersRouter = require("./routes/users");
const authRouter = require("./routes/auth");
const dashboardRouter = require("./routes/dashboard");
const { hashPassword } = require("./auth-utils");

const app = express();
const PORT = Number(process.env.PORT) || 5001;
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "IoT Fire System API running",
  });
});

app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({
      status: "success",
      database: "connected",
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      database: "disconnected",
      message: "PostgreSQL connection failed",
    });
  }
});

app.use("/api/readings", readingsRouter);
app.use("/api/fire-events", fireEventsRouter);
app.use("/api/alarms", alarmsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/devices", devicesRouter);
app.use("/api/users", usersRouter);
app.use("/api/auth", authRouter);
app.use("/api/dashboard", dashboardRouter);

app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);
  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
});

async function columnExists(tableName, columnName) {
  const result = await db.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2
    `,
    [tableName, columnName]
  );

  return result.rowCount > 0;
}

async function renameLegacyColumn(tableName, oldName, newName) {
  if ((await columnExists(tableName, oldName)) && !(await columnExists(tableName, newName))) {
    await db.query(`ALTER TABLE ${tableName} RENAME COLUMN ${oldName} TO ${newName}`);
  }
}

async function ensureDatabaseSchema() {
  await renameLegacyColumn("fire_events", "reading_id", "sensor_reading_id");
  await renameLegacyColumn("alarms", "event_id", "fire_event_id");
  await renameLegacyColumn("notifications", "event_id", "fire_event_id");

  await db.query("ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS humidity NUMERIC(12, 2)");
  await db.query("ALTER TABLE fire_events ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP");
  await db.query("ALTER TABLE alarms ADD COLUMN IF NOT EXISTS buzzer_active BOOLEAN NOT NULL DEFAULT TRUE");
  await db.query("ALTER TABLE alarms ADD COLUMN IF NOT EXISTS led_active BOOLEAN NOT NULL DEFAULT TRUE");
  await db.query("ALTER TABLE alarms ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP");
  await db.query("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP");
}

async function startServer() {
  try {
    await db.query("SELECT NOW()");
    console.log("Connected to PostgreSQL");
    await ensureDatabaseSchema();

    await db.query(
      `
      INSERT INTO users (name, email, password, role, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        updated_at = NOW()
      `,
      [
        "cinifix",
        "admin@firesafe.local",
        hashPassword("0147"),
        "admin",
        "active",
      ]
    );
  } catch (error) {
    console.error("PostgreSQL connection check failed:", error.message);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

module.exports = app;
