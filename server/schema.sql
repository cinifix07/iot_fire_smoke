CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  building TEXT,
  floor TEXT,
  room TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  device_code TEXT NOT NULL UNIQUE,
  device_name TEXT NOT NULL,
  ip_address TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_seen_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sensors (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  sensor_type TEXT NOT NULL,
  sensor_name TEXT NOT NULL,
  pin_number INTEGER,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS sensor_readings (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  sensor_id INTEGER REFERENCES sensors(id) ON DELETE SET NULL,
  smoke_level NUMERIC(12, 2) NOT NULL,
  temperature NUMERIC(12, 2) NOT NULL,
  humidity NUMERIC(12, 2),
  flame_detected BOOLEAN NOT NULL DEFAULT FALSE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fire_events (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  sensor_reading_id INTEGER NOT NULL REFERENCES sensor_readings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'HIGH',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS alarms (
  id SERIAL PRIMARY KEY,
  fire_event_id INTEGER NOT NULL REFERENCES fire_events(id) ON DELETE CASCADE,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  alarm_type TEXT NOT NULL,
  buzzer_active BOOLEAN NOT NULL DEFAULT TRUE,
  led_active BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'active',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fire_event_id INTEGER NOT NULL REFERENCES fire_events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'fire_alert',
  status TEXT NOT NULL DEFAULT 'unread',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  details TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_recorded_at ON sensor_readings (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_fire_events_detected_at ON fire_events (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_alarms_activated_at ON alarms (activated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications (sent_at DESC);
