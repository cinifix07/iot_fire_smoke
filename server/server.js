const fs = require('fs')
const path = require('path')
const express = require('express')
const cors = require('cors')

const PORT = Number(process.env.PORT || 3001)
const DEVICE_TIMEOUT_MS = Number(process.env.DEVICE_TIMEOUT_MS || 5000)
const SERIAL_LOG_FILE = process.env.WOKWI_SERIAL_LOG_FILE
  ? path.resolve(process.env.WOKWI_SERIAL_LOG_FILE)
  : null

const app = express()
const clients = new Set()

const now = () => new Date().toISOString()

const state = {
  connected: false,
  mode: SERIAL_LOG_FILE ? 'wokwi-live' : 'local-sim',
  source: SERIAL_LOG_FILE ? path.basename(SERIAL_LOG_FILE) : 'simulator',
  lastSeenAt: now(),
  telemetry: {
    type: 'telemetry',
    device_id: 'FIRE-SYSTEM-001',
    smoke: 12,
    temperature: 24,
    flame: 1,
    fire: false,
    alarm: false,
    timestamp: Date.now(),
  },
  events: [
    {
      id: 'boot',
      time: now(),
      title: 'Dashboard ready',
      details: SERIAL_LOG_FILE
        ? 'Waiting for Wokwi serial telemetry.'
        : 'Running in local simulator mode.',
      severity: 'info',
    },
  ],
  history: [
    { time: Date.now() - 120000, temperature: 23.4, smoke: 11.2 },
    { time: Date.now() - 60000, temperature: 23.8, smoke: 11.8 },
    { time: Date.now(), temperature: 24, smoke: 12 },
  ],
}

let lastTelemetrySignature = ''

app.use(cors())
app.use(express.json())

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true' || value === '1') return true
    if (value.toLowerCase() === 'false' || value === '0') return false
  }

  return fallback
}

function pushEvent(title, details, severity = 'info') {
  state.events.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    time: now(),
    title,
    details,
    severity,
  })

  state.events = state.events.slice(0, 8)
}

function updateHistory(telemetry) {
  state.history.push({
    time: Date.now(),
    temperature: telemetry.temperature,
    smoke: telemetry.smoke,
  })

  state.history = state.history.slice(-12)
}

function broadcast() {
  const payload = JSON.stringify(state)

  for (const client of clients) {
    client.write(`event: snapshot\n`)
    client.write(`data: ${payload}\n\n`)
  }
}

function ingestTelemetry(payload, source = 'bridge') {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const telemetry = {
    type: payload.type || 'telemetry',
    device_id: payload.device_id || 'FIRE-SYSTEM-001',
    smoke: Number.isFinite(Number(payload.smoke))
      ? Number(payload.smoke)
      : Number(payload.smoke_level ?? state.telemetry.smoke),
    temperature: Number.isFinite(Number(payload.temperature))
      ? Number(payload.temperature)
      : Number(state.telemetry.temperature),
    flame: Number.isFinite(Number(payload.flame))
      ? Number(payload.flame)
      : Number(state.telemetry.flame),
    fire: parseBoolean(payload.fire ?? payload.alarm, state.telemetry.fire),
    alarm: parseBoolean(payload.alarm ?? payload.fire, state.telemetry.alarm),
    timestamp: Number.isFinite(Number(payload.timestamp))
      ? Number(payload.timestamp)
      : Date.now(),
  }

  const signature = JSON.stringify({
    smoke: telemetry.smoke,
    temperature: telemetry.temperature,
    flame: telemetry.flame,
    fire: telemetry.fire,
    alarm: telemetry.alarm,
  })

  if (signature === lastTelemetrySignature) {
    state.connected = true
    state.mode = SERIAL_LOG_FILE ? 'wokwi-live' : source
    state.source = source
    state.lastSeenAt = now()
    state.telemetry = telemetry
    broadcast()
    return true
  }

  lastTelemetrySignature = signature
  state.connected = true
  state.mode = SERIAL_LOG_FILE ? 'wokwi-live' : source
  state.source = source
  state.lastSeenAt = now()
  state.telemetry = telemetry
  updateHistory(telemetry)

  if (telemetry.fire) {
    pushEvent(
      'Fire detected',
      `Smoke ${telemetry.smoke.toFixed(0)} ppm, temperature ${telemetry.temperature.toFixed(1)} C`,
      'critical',
    )
  } else if (telemetry.smoke > 3000 || telemetry.temperature > 50 || telemetry.flame === 0) {
    pushEvent(
      'Alert condition',
      'One or more sensor thresholds were exceeded.',
      'warning',
    )
  } else {
    pushEvent(
      'Telemetry update',
      `Smoke ${telemetry.smoke.toFixed(0)} ppm and temperature ${telemetry.temperature.toFixed(1)} C`,
      'info',
    )
  }

  broadcast()
  return true
}

function parseTelemetryLine(line) {
  const trimmed = line.trim()
  if (!trimmed) {
    return
  }

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end <= start) {
    return
  }

  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1))
    ingestTelemetry(parsed, 'wokwi')
  } catch {
    // Ignore non-JSON serial chatter.
  }
}

function startSerialLogWatcher(logFile) {
  let cursor = 0
  let carry = ''

  const readNewContent = async () => {
    try {
      const stats = await fs.promises.stat(logFile)

      if (stats.size < cursor) {
        cursor = 0
        carry = ''
      }

      if (stats.size === cursor) {
        return
      }

      const handle = await fs.promises.open(logFile, 'r')
      try {
        const length = stats.size - cursor
        const buffer = Buffer.alloc(length)
        await handle.read(buffer, 0, length, cursor)
        cursor = stats.size
        carry += buffer.toString('utf8')

        const lines = carry.split(/\r?\n/)
        carry = lines.pop() || ''

        for (const line of lines) {
          parseTelemetryLine(line)
        }
      } finally {
        await handle.close()
      }
    } catch {
      // The file may not exist yet while Wokwi CLI is starting.
    }
  }

  fs.watchFile(logFile, { interval: 500 }, () => {
    readNewContent()
  })

  readNewContent()
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    connected: state.connected,
    mode: state.mode,
    source: state.source,
    lastSeenAt: state.lastSeenAt,
  })
})

app.get('/api/state', (_req, res) => {
  res.json(state)
})

app.get('/api/telemetry/stream', (req, res) => {
  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  clients.add(res)

  res.write(`event: snapshot\n`)
  res.write(`data: ${JSON.stringify(state)}\n\n`)

  const heartbeat = setInterval(() => {
    res.write(': keep-alive\n\n')
  }, 15000)

  req.on('close', () => {
    clearInterval(heartbeat)
    clients.delete(res)
  })
})

app.post('/api/telemetry', (req, res) => {
  const accepted = ingestTelemetry(req.body, 'bridge')

  res.json({
    ok: accepted,
    state,
  })
})

app.listen(PORT, () => {
  console.log(`Telemetry bridge listening on http://127.0.0.1:${PORT}`)

  if (SERIAL_LOG_FILE) {
    console.log(`Watching Wokwi serial log: ${SERIAL_LOG_FILE}`)
    startSerialLogWatcher(SERIAL_LOG_FILE)
  } else {
    console.log('Running in local simulator fallback mode.')
    setInterval(() => {
      const tick = Date.now() / 1000
      const smoke = 12 + Math.round(Math.sin(tick / 4) * 6)
      const temperature = 24 + Math.round(Math.sin(tick / 6) * 2)
      const flame = 1
      const fire = smoke > 16 || temperature > 26 ? false : false

      ingestTelemetry(
        {
          type: 'telemetry',
          device_id: 'FIRE-SYSTEM-001',
          smoke,
          temperature,
          flame,
          fire,
          alarm: fire,
          timestamp: Date.now(),
        },
        'local-sim',
      )
    }, 2000)
  }
})

if (SERIAL_LOG_FILE) {
  setInterval(() => {
    const age = Date.now() - new Date(state.lastSeenAt).getTime()

    if (state.connected && age > DEVICE_TIMEOUT_MS) {
      state.connected = false
      pushEvent('Telemetry interrupted', 'No device heartbeat has been received.', 'warning')
      broadcast()
    }
  }, 1000)
}
