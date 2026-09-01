const { Client } = require("pg");
require("dotenv").config();

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await client.connect();

  const tables = [
    "sensor_readings",
    "fire_events",
    "alarms",
    "notifications",
    "devices",
    "users",
  ];

  for (const tableName of tables) {
    const result = await client.query(
      `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
      `,
      [tableName]
    );

    console.log(`TABLE ${tableName}`);
    for (const row of result.rows) {
      console.log(`- ${row.column_name} (${row.data_type})`);
    }
  }

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
