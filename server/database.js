const { Pool } = require("pg");
require("dotenv").config();

const {
  DB_HOST,
  DB_PORT = "5432",
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  DB_SSL = "false",
} = process.env;

const pool = new Pool({
  host: DB_HOST,
  port: Number(DB_PORT),
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl:
    DB_SSL === "true"
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

module.exports = pool;
