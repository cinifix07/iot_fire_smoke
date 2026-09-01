import { useEffect, useMemo, useRef, useState } from 'react'
import { createApiClient } from '../services/api.js'
import { ADMIN_NAV_ITEMS as NAV_ITEMS } from './navigation.js'
import './style.css'

const API_BASE_CANDIDATES = [
  typeof import.meta !== 'undefined' ? import.meta.env.VITE_API_BASE_URL : '',
  '',
  'http://127.0.0.1:5001',
  'http://localhost:5001',
  'http://127.0.0.1:5000',
  'http://localhost:5000',
]

const FALLBACK_SNAPSHOT = {
  connected: false,
  mode: 'connecting',
  source: 'waiting-for-telemetry',
  lastSeenAt: null,
  telemetry: {
    device_id: 'FIRE-SYSTEM-001',
    device_name: 'Wokwi ESP32 DevKit V1',
    sensor_name: 'MQ-2 Gas Sensor',
    smoke: 12,
    temperature: 24,
    humidity: 40,
    flame: 1,
    fire: false,
    alarm: false,
    timestamp: Date.now(),
  },
  events: [
    {
      id: 'boot',
      time: new Date().toISOString(),
      title: 'Dashboard ready',
      details: 'Waiting for live telemetry from the Wokwi simulator.',
      severity: 'info',
    },
  ],
  history: [
    { time: Date.now() - 120000, temperature: 23.4, smoke: 11.2, humidity: 39.6 },
    { time: Date.now() - 60000, temperature: 23.8, smoke: 11.8, humidity: 39.8 },
    { time: Date.now(), temperature: 24, smoke: 12, humidity: 40 },
  ],
  notifications: [],
  devices: [],
  alarms: [],
  unreadNotifications: 0,
  activeAlarms: 0,
  fireStatus: 'NO_DATA',
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.toLowerCase()
    if (normalized === 'true' || normalized === '1') return true
    if (normalized === 'false' || normalized === '0') return false
  }
  return fallback
}

function normalizeTimestamp(value, fallback = Date.now()) {
  const numeric = Number(value)
  if (Number.isFinite(numeric)) return numeric

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.getTime()
}

function dedupeBases(bases) {
  return bases.filter((base, index, allBases) => allBases.indexOf(base) === index && (base || index === allBases.indexOf('')))
}

function buildEndpoint(base, path) {
  return base ? `${base}${path}` : path
}

function formatClock(value) {
  if (!value) return 'Waiting for data'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Waiting for data'

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatLongDate(value) {
  if (!value) return 'Waiting for data'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Waiting for data'

  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatShortClock(value) {
  if (!value) return '--:--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildSeries(history, key) {
  const points = history.slice(-8)
  if (points.length === 0) return []

  const values = points.map((point) => toNumber(point?.[key], 0))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = Math.max(max - min, 1)

  return points.map((point, index) => {
    const value = values[index]
    const ratio = (value - min) / spread

    return {
      label: formatShortClock(point?.time),
      value,
      height: Math.round(24 + ratio * 74),
    }
  })
}

function calculateRisk(telemetry, activeAlarms) {
  const smokeValue = toNumber(telemetry.smoke, 0)
  const temperatureValue = toNumber(telemetry.temperature, 0)
  const humidityValue = toNumber(telemetry.humidity, 0)
  const flameDetected = toNumber(telemetry.flame, 1) === 0
  const warningDetected = smokeValue >= 1500 || temperatureValue >= 50 || humidityValue <= 30 || humidityValue >= 70

  const reasons = []

  if (smokeValue >= 3000) reasons.push('Smoke level exceeded the danger threshold.')
  else if (smokeValue >= 1500) reasons.push('Smoke level is elevated.')

  if (temperatureValue >= 50) reasons.push('Temperature is in the warning range.')

  if (humidityValue <= 30 || humidityValue >= 70) reasons.push('Humidity is outside the safe band.')
  if (flameDetected) reasons.push('Flame sensor detected fire.')
  if (activeAlarms > 0) reasons.push('One or more alarms are active.')

  let score = 12
  score += Math.min(Math.round((smokeValue / 3000) * 38), 38)
  score += Math.min(Math.round((temperatureValue / 50) * 30), 30)
  score += humidityValue <= 30 || humidityValue >= 70 ? 8 : 0
  score += flameDetected ? 20 : 0
  score += activeAlarms > 0 ? 12 : 0
  score = Math.max(0, Math.min(score, 100))

  if (flameDetected) {
    return {
      score,
      label: 'Fire Detected',
      tone: 'critical',
      details: 'Immediate evacuation response required.',
      recommendation: 'Initiate evacuation, confirm relay output, and inspect the monitored area immediately.',
      reasons: reasons.length ? reasons : ['Critical fire conditions detected.'],
    }
  }

  if (warningDetected) {
    return {
      score,
      label: 'Warning Condition',
      tone: 'warning',
      details: 'Temperature, smoke, or humidity requires attention.',
      recommendation: 'Continue monitoring and verify ventilation and sensor placement.',
      reasons: reasons.length ? reasons : ['A sensor is in its warning range.'],
    }
  }

  return {
    score,
    label: 'System Secure',
    tone: 'safe',
    details: 'All sensors operating normally.',
    recommendation: 'Maintain continuous monitoring.',
    reasons: reasons.length ? reasons : ['All monitored values remain within limits.'],
  }
}

function buildSnapshot(statusPayload, historyPayload, notificationsPayload, devicesPayload, alarmsPayload) {
  const statusData = statusPayload?.data || {}
  const historyData = historyPayload?.data || {}
  const notifications = Array.isArray(notificationsPayload?.data) ? notificationsPayload.data : []
  const devices = Array.isArray(devicesPayload?.data) ? devicesPayload.data : []
  const alarms = Array.isArray(alarmsPayload?.data) ? alarmsPayload.data : []

  const latestReading = statusData.latest_reading || null
  const latestEvent = statusData.latest_fire_event || null
  const recentEvents = Array.isArray(historyData.recent_fire_events) ? historyData.recent_fire_events : []
  const alarmHistory = Array.isArray(historyData.alarm_history) ? historyData.alarm_history : []
  const sensorTrends = Array.isArray(historyData.sensor_trends) ? historyData.sensor_trends : []

  const telemetry = {
    device_id: latestReading?.device_id ? String(latestReading.device_id) : FALLBACK_SNAPSHOT.telemetry.device_id,
    device_name: latestReading?.device_name || FALLBACK_SNAPSHOT.telemetry.device_name,
    sensor_name: latestReading?.sensor_name || FALLBACK_SNAPSHOT.telemetry.sensor_name,
    smoke: toNumber(statusData.latest_smoke, latestReading?.smoke_level ?? FALLBACK_SNAPSHOT.telemetry.smoke),
    temperature: toNumber(statusData.latest_temperature, latestReading?.temperature ?? FALLBACK_SNAPSHOT.telemetry.temperature),
    humidity: toNumber(statusData.latest_humidity, latestReading?.humidity ?? FALLBACK_SNAPSHOT.telemetry.humidity),
    flame: statusData.flame_status !== undefined
      ? (toBoolean(statusData.flame_status) ? 0 : 1)
      : (toBoolean(latestReading?.flame_detected) ? 0 : 1),
    fire: statusData.fire_status === 'CRITICAL',
    alarm: toNumber(statusData.active_alarms, 0) > 0,
    timestamp: normalizeTimestamp(latestReading?.recorded_at || latestEvent?.detected_at || Date.now()),
  }

  const events = [
    ...sensorTrends.slice(0, 3).map((reading) => ({
      id: `reading-${reading.id}`,
      time: reading.recorded_at,
      title: `Live reading #${reading.id}`,
      details: `Temperature ${toNumber(reading.temperature, 0).toFixed(1)} C, smoke ${toNumber(reading.smoke_level, 0).toFixed(0)} ppm, humidity ${toNumber(reading.humidity, 0).toFixed(1)} %.`,
      severity: reading.flame_detected ? 'critical' : 'info',
    })),
    ...(latestEvent
      ? [{
          id: `fire-${latestEvent.id}`,
          time: latestEvent.detected_at,
          title: latestEvent.event_type || 'Fire event',
          details: latestEvent.description || latestEvent.severity || 'Fire event detected',
          severity: latestEvent.severity || 'warning',
        }]
      : []),
    ...recentEvents.slice(0, 3).map((event) => ({
      id: `event-${event.id}`,
      time: event.detected_at,
      title: event.event_type || 'Fire event',
      details: event.description || event.severity || 'Fire event detected',
      severity: event.severity || 'warning',
    })),
    ...alarmHistory.slice(0, 2).map((alarm) => ({
      id: `alarm-${alarm.id}`,
      time: alarm.activated_at,
      title: alarm.alarm_type || 'Alarm',
      details: alarm.status || 'Alarm activated',
      severity: alarm.status === 'active' ? 'warning' : 'info',
    })),
  ]

  return {
    connected: Boolean(statusData.latest_reading || recentEvents.length || notifications.length || devices.length || alarms.length),
    mode: 'wokwi-live',
    source: 'wokwi-postgresql-live',
    lastSeenAt: latestReading?.recorded_at || latestEvent?.detected_at || notifications[0]?.sent_at || Date.now(),
    telemetry,
    events: events.length
      ? events
      : [{
          id: 'boot',
          time: new Date().toISOString(),
          title: 'Dashboard ready',
          details: 'Connected to the PostgreSQL backend.',
          severity: 'info',
        }],
    history: sensorTrends.map((point) => ({
      time: normalizeTimestamp(point.recorded_at),
      temperature: point.temperature,
      smoke: point.smoke_level,
      humidity: point.humidity ?? telemetry.humidity,
    })),
    notifications: notifications.length
      ? notifications
      : [{
          id: 'notification-boot',
          title: 'Telemetry connected',
          message: 'Awaiting the next sensor update.',
          notification_type: 'info',
          status: 'unread',
          sent_at: new Date().toISOString(),
        }],
    devices: devices.length
      ? devices
      : [{
          id: 'device-boot',
          device_code: 'wokwi-esp32-devkit-v1',
          device_name: telemetry.device_name,
          status: 'active',
          last_seen_at: telemetry.timestamp,
        }],
    alarms: alarms.length ? alarms : alarmHistory,
    unreadNotifications: notifications.filter((item) => item.status === 'unread').length,
    activeAlarms: toNumber(statusData.active_alarms, 0),
    fireStatus: statusData.fire_status || 'NO_DATA',
  }
}

function buildOfflineSnapshot() {
  return {
    ...FALLBACK_SNAPSHOT,
    connected: false,
    mode: 'offline',
    source: 'telemetry-bridge-unreachable',
    lastSeenAt: null,
    unreadNotifications: 0,
    activeAlarms: 0,
    fireStatus: 'NO_DATA',
  }
}

function StatusCard({ title, value, subtitle, tone, icon, meta }) {
  return (
    <article className={`status-card status-card--${tone}`}>
      <div className="status-card__header">
        <span className="status-card__eyebrow">{title}</span>
        <span className="material-symbols-outlined status-card__icon" aria-hidden="true">
          {icon}
        </span>
      </div>
      <div className="status-card__body">
        <strong className="status-card__value">{value}</strong>
        <span className={`status-card__badge status-card__badge--${tone}`}>{subtitle}</span>
      </div>
      {meta ? <p className="status-card__meta">{meta}</p> : null}
    </article>
  )
}

function Dashboard({ onLogout, onNavigate, user, activePage = 'dashboard' }) {
  const [snapshot, setSnapshot] = useState(FALLBACK_SNAPSHOT)
  const [connectionState, setConnectionState] = useState('connecting')
  const [refreshing, setRefreshing] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const liveStreamRef = useRef(null)
  const mountedRef = useRef(false)

  const metricSeries = useMemo(() => ({
    temperature: buildSeries(snapshot.history, 'temperature'),
    smoke: buildSeries(snapshot.history, 'smoke'),
    humidity: buildSeries(snapshot.history, 'humidity'),
  }), [snapshot.history])

  const risk = useMemo(() => calculateRisk(snapshot.telemetry, snapshot.activeAlarms), [snapshot.telemetry, snapshot.activeAlarms])

  const lastUpdateLabel = formatClock(snapshot.lastSeenAt)
  const lastUpdateVerbose = formatLongDate(snapshot.lastSeenAt)
  const closeSidebar = () => setSidebarOpen(false)
  const closeStream = () => {
    if (liveStreamRef.current) {
      liveStreamRef.current.close()
      liveStreamRef.current = null
    }
  }

  const openStream = (base) => {
    if (!mountedRef.current) return
    closeStream()

    try {
      const stream = new EventSource(buildEndpoint(base, '/api/dashboard/live'))
      liveStreamRef.current = stream

      stream.onopen = () => {
        if (mountedRef.current) setConnectionState('live')
      }

      stream.addEventListener('ready', () => {
        if (mountedRef.current) setConnectionState('live')
      })

      stream.addEventListener('dashboard-update', () => {
        void refreshState(false)
      })

      stream.onerror = () => {
        if (!mountedRef.current) return
        setConnectionState((current) => (current === 'offline' ? current : 'reconnecting'))
      }
    } catch {
      setConnectionState('offline')
    }
  }

  const fetchSnapshot = async () => {
    const bases = dedupeBases(API_BASE_CANDIDATES)

    for (const base of bases) {
      try {
        const client = createApiClient(base, { timeout: 4000 })
        const [statusResponse, historyResponse, notificationsResponse, devicesResponse, alarmsResponse] = await Promise.all([
          client.get('/api/dashboard/status'),
          client.get('/api/dashboard/history'),
          client.get('/api/notifications?limit=8'),
          client.get('/api/devices?limit=8'),
          client.get('/api/alarms?limit=8'),
        ])

        openStream(base)

        return buildSnapshot(
          statusResponse.data,
          historyResponse.data,
          notificationsResponse.data,
          devicesResponse.data,
          alarmsResponse.data,
        )
      } catch {
        // Try the next backend candidate.
      }
    }

    return null
  }

  const refreshState = async (showSpinner = true) => {
    if (!mountedRef.current) return
    if (showSpinner) setRefreshing(true)

    try {
      const nextSnapshot = await fetchSnapshot()
      if (!nextSnapshot) {
        throw new Error('Backend unavailable')
      }

      setSnapshot(nextSnapshot)
      setConnectionState('live')
    } catch {
      closeStream()
      setSnapshot(buildOfflineSnapshot())
      setConnectionState('offline')
    } finally {
      if (mountedRef.current && showSpinner) setRefreshing(false)
    }
  }

  useEffect(() => {
    mountedRef.current = true

    void refreshState(false)

    const intervalId = window.setInterval(() => {
      void refreshState(false)
    }, 15000)

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      mountedRef.current = false
      closeStream()
      window.clearInterval(intervalId)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const handleExportCsv = () => {
    const rows = ['time,temperature,smoke,humidity']
    snapshot.history.forEach((point) => {
      rows.push([
        formatLongDate(point.time),
        toNumber(point.temperature, 0),
        toNumber(point.smoke, 0),
        toNumber(point.humidity, 0),
      ].join(','))
    })

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'wokwi-dashboard-history.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`dashboard-shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className="dashboard-glow" />

      <aside className={`dashboard-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="dashboard-brand">
          <div className="dashboard-brand__mark" aria-hidden="true">
            <span className="material-symbols-outlined">shield_with_heart</span>
          </div>
          <h2>GuardianMesh IoT</h2>
          <p>{connectionState === 'live' ? 'Live telemetry active' : 'Monitoring standby'}</p>
        </div>

        <nav className="dashboard-nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button
              className={`dashboard-nav__link ${item.page === activePage ? 'is-active' : ''}`}
              key={item.label}
              type="button"
              onClick={() => {
                if (item.page) onNavigate?.(item.page)
                closeSidebar()
              }}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="dashboard-sidebar__footer">
          <button className="dashboard-emergency" type="button" onClick={closeSidebar}>
            <span className="material-symbols-outlined" aria-hidden="true">
              warning
            </span>
            Emergency Override
          </button>
          <div className={`dashboard-connection is-${connectionState}`}>
            {connectionState.replace('-', ' ')}
          </div>
          <button className="dashboard-sidebar__link" type="button" onClick={closeSidebar}>
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
            Close panel
          </button>
        </div>
      </aside>

      {sidebarOpen ? <button className="dashboard-backdrop" type="button" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} /> : null}

      <div className="dashboard-content">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar__left">
            <button
              className="dashboard-icon-button"
              type="button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen((open) => !open)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                menu
              </span>
            </button>
          </div>

          <div className="dashboard-topbar__actions">
            <div className={`dashboard-connection is-${connectionState}`}>
              {refreshing ? 'refreshing' : connectionState === 'live' ? 'live' : connectionState}
            </div>
            <button
              className="dashboard-icon-button"
              type="button"
              aria-label="Refresh dashboard"
              onClick={() => void refreshState(true)}
            >
              <span className={`material-symbols-outlined ${refreshing ? 'is-spinning' : ''}`} aria-hidden="true">
                refresh
              </span>
            </button>
            <button className="dashboard-icon-button" type="button" aria-label="Notifications">
              <span className="material-symbols-outlined" aria-hidden="true">
                notifications
              </span>
              {snapshot.unreadNotifications > 0 ? <span className="dashboard-notification-dot" /> : null}
            </button>
            <div className="dashboard-user-chip">
              <span className="material-symbols-outlined" aria-hidden="true">
                person
              </span>
              <span>{user?.name || 'Operator'}</span>
            </div>
            <button className="dashboard-user-chip dashboard-user-chip--outline" type="button" onClick={onLogout}>
              <span className="material-symbols-outlined" aria-hidden="true">
                logout
              </span>
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="dashboard-main" id="overview">
          <section className="dashboard-intro">
            <h1>Overview</h1>
            <p>Wokwi Live Feed is feeding live telemetry into PostgreSQL and the dashboard below.</p>
          </section>

          <section className="dashboard-hero-grid">
            <article className={`dashboard-hero dashboard-hero--${risk.tone}`}>
              <div className="dashboard-hero__icon-wrap" aria-hidden="true">
                <div className="dashboard-hero__pulse" />
                {risk.tone === 'critical' ? (
                  <span className={`material-symbols-outlined dashboard-hero__icon dashboard-hero__icon--critical`}>
                    local_fire_department
                  </span>
                ) : (
                  <span className={`dashboard-hero__icon dashboard-hero__icon--safe`} aria-hidden="true">
                    <svg
                      className="dashboard-hero__icon-svg"
                      viewBox="0 0 24 24"
                      role="img"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        fill="currentColor"
                        d="M12 2.25 5.5 4.5v5.15c0 4.64 2.87 8.84 6.5 10.6 3.63-1.76 6.5-5.96 6.5-10.6V4.5L12 2.25Zm0 2.12 4.5 1.56v3.57c0 3.77-2.14 7.19-4.5 8.78-2.36-1.59-4.5-5.01-4.5-8.78V5.93L12 4.37Z"
                      />
                    </svg>
                  </span>
                )}
              </div>
              <h2>{risk.label}</h2>
              <p>{risk.details}</p>
              <span className="dashboard-hero__recommendation">{risk.recommendation}</span>
            </article>

            <article className="dashboard-activity" id="fire-events">
              <h3>
                <span className="material-symbols-outlined" aria-hidden="true">
                  history
                </span>
                Activity Log
              </h3>
              <div className="dashboard-activity__list">
                {snapshot.events.slice(0, 5).map((event) => (
                  <div className="dashboard-timeline-item" key={event.id}>
                    <div className="dashboard-timeline-item__dot" />
                    <div className="dashboard-timeline-item__content">
                      <div className="dashboard-timeline-item__time">{formatClock(event.time)}</div>
                      <div className="dashboard-timeline-item__title">{event.title}</div>
                      <div className="dashboard-timeline-item__details">{event.details}</div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="dashboard-metrics" id="sensor-data">
            <StatusCard
              title="Temperature"
              value={`${toNumber(snapshot.telemetry.temperature, 0).toFixed(1)} C`}
              subtitle={snapshot.telemetry.temperature >= 50 ? 'WARNING' : 'NOMINAL'}
              tone={snapshot.telemetry.temperature >= 50 ? 'warning' : 'info'}
              icon="device_thermostat"
              meta="Live sensor telemetry from the Wokwi bench."
            />
            <StatusCard
              title="Smoke Level"
              value={`${toNumber(snapshot.telemetry.smoke, 0)} ppm`}
              subtitle={snapshot.telemetry.smoke >= 1500 ? 'ELEVATED' : 'SAFE'}
              tone={snapshot.telemetry.smoke >= 1500 ? 'warning' : 'safe'}
              icon="air"
              meta="MQ-2 gas sensor output."
            />
            <StatusCard
              title="Humidity"
              value={`${toNumber(snapshot.telemetry.humidity, 0).toFixed(1)} %`}
              subtitle="NOMINAL"
              tone="safe"
              icon="water_drop"
              meta="DHT22 humidity reading."
            />
            <StatusCard
              title="Flame Sensor"
              value={toNumber(snapshot.telemetry.flame, 1) === 0 ? 'Detected' : 'Clear'}
              subtitle={toNumber(snapshot.telemetry.flame, 1) === 0 ? 'IMMEDIATE ACTION REQUIRED' : 'NO FLAME DETECTED'}
              tone={toNumber(snapshot.telemetry.flame, 1) === 0 ? 'critical' : 'safe'}
              icon="local_fire_department"
              meta={`Fire status ${snapshot.fireStatus}`}
            />
          </section>

          <section className="dashboard-lower-grid">
            <article className="dashboard-chart">
              <div className="dashboard-chart__header">
                <div>
                  <h3>Temperature Stability (12h)</h3>
                  <p>Updated {lastUpdateVerbose} • {snapshot.source}</p>
                </div>
                <div className="dashboard-chart__actions">
                  <button type="button" onClick={() => void refreshState(true)}>
                    Refresh
                  </button>
                  <button type="button" onClick={handleExportCsv}>
                    Export CSV
                  </button>
                </div>
              </div>

              <div className="dashboard-bars" aria-hidden="true">
                {metricSeries.temperature.map((point, index) => (
                  <div className="dashboard-bar" key={`${point.label}-${index}`}>
                    <span className="dashboard-bar__fill" style={{ height: `${point.height}%` }} />
                    <span className="dashboard-bar__label">{point.label}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboard-summary">
              <h3>System Snapshot</h3>
              <p>{risk.recommendation}</p>
              <ul>
                <li>Connection: {connectionState}</li>
                <li>Last update: {lastUpdateLabel}</li>
                <li>Active alarms: {snapshot.activeAlarms}</li>
                <li>Unread notifications: {snapshot.unreadNotifications}</li>
              </ul>
            </article>
          </section>
        </main>
      </div>
    </div>
  )
}

export default Dashboard
