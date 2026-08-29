import { useEffect, useMemo, useRef, useState } from 'react'
import './style.css'

const API_BASE_CANDIDATES = [
  typeof import.meta !== 'undefined' ? import.meta.env.VITE_API_BASE_URL : '',
  '',
  'http://127.0.0.1:3001',
]

const navigationItems = [
  { icon: 'dashboard', label: 'Dashboard', target: 'overview', filled: true },
  { icon: 'visibility', label: 'Live Monitoring', target: 'live-monitoring' },
  { icon: 'analytics', label: 'Sensor Data', target: 'sensor-data' },
  { icon: 'history', label: 'Fire Events', target: 'fire-events' },
  { icon: 'sensors', label: 'Device Status', target: 'device-status' },
]

const fallbackState = {
  connected: false,
  mode: 'connecting',
  source: 'waiting-for-telemetry',
  lastSeenAt: null,
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
      time: new Date().toISOString(),
      title: 'Dashboard ready',
      details: 'Waiting for the Wokwi telemetry bridge.',
      severity: 'info',
    },
  ],
  history: [
    { time: Date.now() - 120000, temperature: 23.4, smoke: 11.2 },
    { time: Date.now() - 60000, temperature: 23.8, smoke: 11.8 },
    { time: Date.now(), temperature: 24, smoke: 12 },
  ],
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true' || value === '1') return true
    if (value.toLowerCase() === 'false' || value === '0') return false
  }
  return fallback
}

function normalizeTimestamp(value, fallback = Date.now()) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeSnapshot(raw, fallback = fallbackState) {
  const telemetry = raw?.telemetry || fallback.telemetry
  const events = Array.isArray(raw?.events) && raw.events.length ? raw.events : fallback.events
  const history = Array.isArray(raw?.history) && raw.history.length ? raw.history : fallback.history

  return {
    connected: Boolean(raw?.connected),
    mode: raw?.mode || fallback.mode,
    source: raw?.source || fallback.source,
    lastSeenAt: raw?.lastSeenAt || fallback.lastSeenAt,
    telemetry: {
      type: telemetry?.type || 'telemetry',
      device_id: telemetry?.device_id || fallback.telemetry.device_id,
      smoke: toNumber(telemetry?.smoke, fallback.telemetry.smoke),
      temperature: toNumber(telemetry?.temperature, fallback.telemetry.temperature),
      flame: toNumber(telemetry?.flame, fallback.telemetry.flame),
      fire: toBoolean(telemetry?.fire, fallback.telemetry.fire),
      alarm: toBoolean(telemetry?.alarm, fallback.telemetry.alarm),
      timestamp: normalizeTimestamp(telemetry?.timestamp, fallback.telemetry.timestamp),
    },
    events: events.map((event, index) => ({
      id: event?.id || `${index}-${event?.time || Date.now()}`,
      time: event?.time || new Date().toISOString(),
      title: event?.title || 'Telemetry update',
      details: event?.details || event?.title || 'Telemetry update received.',
      severity: event?.severity || 'info',
    })),
    history: history.map((point) => ({
      time: normalizeTimestamp(point?.time),
      temperature: toNumber(point?.temperature, fallback.telemetry.temperature),
      smoke: toNumber(point?.smoke, fallback.telemetry.smoke),
    })),
  }
}

function formatSeenAt(value) {
  if (!value) {
    return 'Waiting for data'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Waiting for data'
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function buildChartBars(history) {
  const points = history.slice(-6)

  if (points.length === 0) {
    return []
  }

  const maxTemperature = Math.max(...points.map((point) => point.temperature))
  const minTemperature = Math.min(...points.map((point) => point.temperature))
  const spread = Math.max(maxTemperature - minTemperature, 1)

  return points.map((point) => {
    const relative = (point.temperature - minTemperature) / spread
    return Math.round(35 + relative * 55)
  })
}

function buildOfflineSnapshot() {
  return normalizeSnapshot({
    connected: false,
    mode: 'offline',
    source: 'telemetry-bridge-unreachable',
    lastSeenAt: null,
    telemetry: fallbackState.telemetry,
    events: [
      {
        id: 'offline',
        time: new Date().toISOString(),
        title: 'Telemetry bridge unavailable',
        details: 'The dashboard is waiting for the backend connection to recover.',
        severity: 'warning',
      },
    ],
    history: [],
  })
}

function dedupeBases(bases) {
  return bases.filter((base, index, allBases) => {
    if (!base) {
      return index === allBases.indexOf('')
    }

    return allBases.indexOf(base) === index
  })
}

function buildEndpoint(base, path) {
  return base ? `${base}${path}` : path
}

function Dashboard({ onLogout }) {
  const [snapshot, setSnapshot] = useState(fallbackState)
  const [connectionState, setConnectionState] = useState('connecting')
  const [activeSection, setActiveSection] = useState('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copyLabel, setCopyLabel] = useState('Copy Snapshot')
  const streamRef = useRef(null)
  const apiBaseRef = useRef('')
  const reconnectTimerRef = useRef(null)
  const retryCountRef = useRef(0)
  const mountedRef = useRef(false)

  const applySnapshot = (nextSnapshot, connectionHint) => {
    if (!mountedRef.current) {
      return
    }

    setSnapshot(normalizeSnapshot(nextSnapshot))

    if (connectionHint) {
      setConnectionState(connectionHint)
    }
  }

  const fetchSnapshotFromBridge = async () => {
    const bases = dedupeBases(API_BASE_CANDIDATES)

    for (const base of bases) {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 3000)

      try {
        const [stateResponse, healthResponse] = await Promise.all([
          fetch(buildEndpoint(base, '/api/state'), { signal: controller.signal }),
          fetch(buildEndpoint(base, '/api/health'), { signal: controller.signal }),
        ])

        if (!stateResponse.ok || !healthResponse.ok) {
          continue
        }

        const [statePayload, healthPayload] = await Promise.all([stateResponse.json(), healthResponse.json()])
        apiBaseRef.current = base
        return {
          snapshot: statePayload,
          connectionState: healthPayload.connected || statePayload?.connected || statePayload?.mode === 'wokwi-live'
            ? 'live'
            : 'standby',
        }
      } catch {
        // Try the next bridge candidate.
      } finally {
        window.clearTimeout(timeout)
      }
    }

    return null
  }

  const refreshState = async (showLoadingState = true) => {
    if (showLoadingState) {
      setIsRefreshing(true)
    }

    try {
      const bridgeState = await fetchSnapshotFromBridge()

      if (!bridgeState) {
        throw new Error('Telemetry bridge returned an error.')
      }

      applySnapshot(bridgeState.snapshot, bridgeState.connectionState)
      retryCountRef.current = 0
    } catch {
      if (streamRef.current) {
        setConnectionState('reconnecting')
      } else {
        applySnapshot(buildOfflineSnapshot(), 'offline')
      }
    } finally {
      if (mountedRef.current && showLoadingState) {
        setIsRefreshing(false)
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true
    const bootstrapTimer = window.setTimeout(() => {
      void refreshState(false)
    }, 0)

    const connectStream = () => {
      if (!mountedRef.current) {
        return
      }

      const streamBase = apiBaseRef.current || dedupeBases(API_BASE_CANDIDATES)[0] || ''

      try {
        streamRef.current?.close()
        const stream = new EventSource(buildEndpoint(streamBase, '/api/telemetry/stream'))
        streamRef.current = stream

        stream.onopen = () => {
          if (mountedRef.current) {
            setConnectionState('live')
          }
          retryCountRef.current = 0
        }

        stream.addEventListener('snapshot', (event) => {
          if (!mountedRef.current) {
            return
          }

          try {
            const nextSnapshot = JSON.parse(event.data)
            applySnapshot(nextSnapshot, nextSnapshot.connected ? 'live' : 'standby')
            retryCountRef.current = 0
          } catch {
            applySnapshot(buildOfflineSnapshot(), 'offline')
          }
        })

        stream.onerror = () => {
          if (!mountedRef.current) {
            return
          }

          setConnectionState((current) => (current === 'live' ? 'reconnecting' : current))

          stream.close()
          const delay = Math.min(3000, 500 * 2 ** retryCountRef.current)
          retryCountRef.current += 1

          if (reconnectTimerRef.current) {
            window.clearTimeout(reconnectTimerRef.current)
          }

          reconnectTimerRef.current = window.setTimeout(() => {
            connectStream()
          }, delay)
        }
      } catch {
        applySnapshot(buildOfflineSnapshot(), 'offline')
      }
    }

    connectStream()

    return () => {
      mountedRef.current = false
      window.clearTimeout(bootstrapTimer)
      streamRef.current?.close()
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
      }
    }
  }, [])

  const telemetry = snapshot.telemetry || fallbackState.telemetry
  const smokeValue = toNumber(telemetry.smoke, fallbackState.telemetry.smoke)
  const temperatureValue = toNumber(telemetry.temperature, fallbackState.telemetry.temperature)
  const flameValue = toNumber(telemetry.flame, fallbackState.telemetry.flame)
  const fireDetected = Boolean(telemetry.fire || telemetry.alarm || flameValue === 0)
  const smokeCritical = smokeValue > 3000
  const temperatureCritical = temperatureValue > 50
  const liveMode = snapshot.connected || snapshot.mode === 'wokwi-live' || snapshot.mode === 'local-sim'
  const chartBars = buildChartBars(snapshot.history || fallbackState.history)
  const latestEvents = snapshot.events?.length ? snapshot.events : []
  const lastSeenLabel = formatSeenAt(snapshot.lastSeenAt)

  const operationalState = fireDetected
    ? {
       
      }
    : smokeCritical || temperatureCritical
      ? {
          
        }
      : {
          
        }

  const feedLabel = snapshot.mode === 'wokwi-live'
    ? 'Wokwi Live Feed'
    : snapshot.mode === 'local-sim'
      ? 'Local Simulator'
      : snapshot.mode === 'offline'
        ? 'Bridge Offline'
        : 'Telemetry Live Feed'

  const summaryCards = useMemo(
    () => [
      {
        label: 'Device',
        value: telemetry.device_id || 'FIRE-SYSTEM-001',
        note: snapshot.source || 'telemetry bridge',
      },
      {
        label: 'Mode',
        value: snapshot.mode || 'connecting',
        note: feedLabel,
      },
      {
        label: 'Last Update',
        value: lastSeenLabel,
        note: snapshot.connected ? 'Live stream active' : 'Awaiting heartbeat',
      },
      {
        label: 'Response',
        value: fireDetected ? 'Immediate' : 'Normal',
        note: fireDetected ? 'Alarm and relay output engaged' : 'Monitoring only',
      },
    ],
    [feedLabel, fireDetected, lastSeenLabel, snapshot.connected, snapshot.mode, snapshot.source, telemetry.device_id],
  )

  const navigateTo = (target) => {
    setActiveSection(target)
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const exportHistory = () => {
    const rows = snapshot.history || []
    const csv = [
      ['timestamp', 'temperature_c', 'smoke_ppm'],
      ...rows.map((point) => [new Date(point.time).toISOString(), point.temperature, point.smoke]),
    ]
      .map((row) => row.join(','))
      .join('\n')

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `guardianmesh-telemetry-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const copySnapshot = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2))
      setCopyLabel('Copied')
      window.setTimeout(() => setCopyLabel('Copy Snapshot'), 1500)
    } catch {
      setCopyLabel('Copy Failed')
      window.setTimeout(() => setCopyLabel('Copy Snapshot'), 1500)
    }
  }

  const metrics = [
    {
      label: 'Temperature',
      icon: 'thermostat',
      value: `${temperatureValue.toFixed(1)} C`,
      status: temperatureCritical ? 'Over limit' : 'Nominal',
      statusClass: temperatureCritical ? 'is-critical' : 'is-accent',
      sparkline: chartBars.length ? chartBars.map((bar) => Math.max(28, Math.min(100, bar))) : [33, 50, 72, 100],
    },
    {
      label: 'Smoke Level',
      icon: 'air',
      value: `${Math.round(smokeValue)} ppm`,
      status: smokeCritical ? 'Danger' : 'Safe',
      statusClass: smokeCritical ? 'is-critical' : 'is-safe',
    },
    {
      label: 'Flame Sensor',
      icon: 'local_fire_department',
      value: fireDetected ? 'Detected' : 'Clear',
      status: fireDetected ? 'Immediate action required' : 'No Flame Detected',
      statusClass: fireDetected ? 'is-critical' : 'is-safe',
      compact: true,
    },
    {
      label: 'Alarm Status',
      icon: 'notifications_active',
      value: fireDetected ? 'Active' : 'Standby',
      status: fireDetected ? 'Buzzer Engaged' : 'Buzzer Ready',
      statusClass: fireDetected ? 'is-critical' : 'is-accent',
      compact: true,
    },
  ]

  const heroTitle = fireDetected ? 'FIRE ALERT' : 'SYSTEM SECURE'
  const heroCopy = fireDetected
    ? 'Evacuation response required. Alarm and indicator relays are active.'
    : 'ESP32, MQ-2, DHT22, and flame sensor are online through the Wokwi bridge.'

  return (
    <div className="admin-page">
      <div className="admin-glow" aria-hidden="true" />

      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand__mark" aria-hidden="true">
            <span className="material-symbols-outlined" data-weight="fill">
              local_fire_department
            </span>
          </div>
          <h2>Fire Safety Core</h2>
          <p>{feedLabel}</p>
        </div>

        <nav className="admin-nav" aria-label="Primary">
          {navigationItems.map((item) => (
            <button
              key={item.label}
              className={`admin-nav__link${activeSection === item.target ? ' is-active' : ''}`}
              type="button"
              onClick={() => navigateTo(item.target)}
            >
              <span
                className="material-symbols-outlined admin-nav__icon"
                aria-hidden="true"
                data-weight={item.filled ? 'fill' : undefined}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <button className="admin-overrides" type="button" title="Reserved for future hardware override integration">
            <span className="material-symbols-outlined" aria-hidden="true">
              warning
            </span>
            Emergency Override
          </button>

     
  
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-topbar">
          <div className="admin-topbar__title">
 
           
       
          </div>

          <div className="admin-topbar__actions" aria-label="System controls">
            <span className={`admin-connection-pill is-${connectionState}`}>
              {snapshot.mode === 'wokwi-live'
                ? 'Wokwi Live'
                : connectionState === 'live'
                  ? 'Live Connected'
                  : connectionState === 'reconnecting'
                    ? 'Reconnecting'
                    : connectionState === 'offline'
                      ? 'Offline'
                      : 'Connecting'}
            </span>
            <button type="button" className="icon-button" aria-label="Refresh telemetry" onClick={refreshState}>
              <span className="material-symbols-outlined" aria-hidden="true">
                refresh
              </span>
            </button>
            <button type="button" className="icon-button" aria-label="Copy telemetry snapshot" onClick={copySnapshot}>
              <span className="material-symbols-outlined" aria-hidden="true">
                content_copy
              </span>
            </button>
            <button type="button" className="icon-button icon-button--notification" aria-label="Notifications">
              <span className="material-symbols-outlined" aria-hidden="true">
                notifications
              </span>
              <span className="icon-button__dot" aria-hidden="true" />
            </button>
            <button type="button" className="profile-button" aria-label="User profile">
              <span className="material-symbols-outlined" aria-hidden="true">
                person
              </span>
            </button>
            <button type="button" className="icon-button" aria-label="Log out" onClick={onLogout}>
              <span className="material-symbols-outlined" aria-hidden="true">
                logout
              </span>
            </button>
          </div>
        </header>

        <main className="admin-main">
          <section className="admin-intro" id="overview">
            <h2>Overview</h2>
         
          </section>

          <section className={`admin-status-banner is-${operationalState.tone}`} id="device-status">
           
            <div className="admin-status-banner__meta">
              <span>{feedLabel}</span>
              <span>Last seen {lastSeenLabel}</span>
            </div>
          </section>

          <section className="admin-summary" aria-label="Telemetry summary">
            {summaryCards.map((card) => (
              <article className="glass-card admin-summary__card" key={card.label}>
                <p className="admin-summary__label">{card.label}</p>
                <h3 className="admin-summary__value">{card.value}</h3>
                <p className="admin-summary__note">{card.note}</p>
              </article>
            ))}
          </section>

          <section className="admin-grid">
            <article className="glass-card admin-hero" id="live-monitoring">
              <div className="admin-hero__halo" aria-hidden="true" />
              <div className="admin-hero__status">
                <div className="admin-hero__orb">
                  <div
                    className={`admin-hero__pulse is-${operationalState.tone}${fireDetected ? ' is-alert' : ''}`}
                    aria-hidden="true"
                  />
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {fireDetected ? 'dangerous' : smokeCritical || temperatureCritical ? 'warning' : 'verified'}
                  </span>
                </div>
                <div className="admin-hero__copy">
                  <h3>{heroTitle}</h3>
                  <p>{heroCopy}</p>
                </div>
                <div className="admin-hero__chips">
                  <span className="admin-chip">Device {telemetry.device_id}</span>
                  <span className="admin-chip">Source {snapshot.source || 'telemetry bridge'}</span>
                  <span className="admin-chip">Updated {formatDateTime(telemetry.timestamp)}</span>
                </div>
              </div>
            </article>

            <article className="glass-card admin-timeline" id="fire-events">
              <h3>
                <span className="material-symbols-outlined" aria-hidden="true">
                  history
                </span>
                Activity Log
              </h3>

              <div className="admin-timeline__list">
                {latestEvents.length ? (
                  latestEvents.slice(0, 3).map((item, index) => (
                    <div className="admin-timeline__item" key={item.id || `${item.time}-${index}`}>
                      <div className="admin-timeline__marker">
                        <span className={`admin-timeline__dot is-${item.severity || 'info'}`} />
                        {index < 2 ? <span className="admin-timeline__line" /> : null}
                      </div>
                      <div className="admin-timeline__content">
                        <p className="admin-timeline__time">{formatSeenAt(item.time)}</p>
                        <p className="admin-timeline__text">{item.details || item.title}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="admin-empty-state">
                    <p>No recent events yet.</p>
                    <span>The system will populate this feed as telemetry arrives.</span>
                  </div>
                )}
              </div>
            </article>

            {metrics.map((metric, index) => (
              <article
                className="glass-card admin-metric"
                id={index === 0 ? 'sensor-data' : undefined}
                key={metric.label}
              >
                <div className="admin-metric__header">
                  <span className="admin-metric__label">{metric.label}</span>
                  <span className="material-symbols-outlined admin-metric__icon" aria-hidden="true">
                    {metric.icon}
                  </span>
                </div>

                <div className="admin-metric__body">
                  <div className="admin-metric__copy">
                    <span className={`admin-metric__value${metric.compact ? ' is-compact' : ''}`}>
                      {metric.value}
                    </span>
                    <span className={`admin-metric__status ${metric.statusClass || ''}`.trim()}>
                      {metric.status}
                    </span>
                  </div>

                  {metric.sparkline ? (
                    <div className="admin-sparkline" aria-hidden="true">
                      {metric.sparkline.map((height, barIndex) => (
                        <span
                          className="admin-sparkline__bar"
                          key={`${metric.label}-${barIndex}`}
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}

            <article className="glass-card admin-chart">
              <div className="admin-chart__header">
                <div>
                  <h3>Temperature Stability (12h)</h3>
                  <p className="admin-chart__subtitle">
                    Updated {lastSeenLabel}
                    {snapshot.source ? ` - ${snapshot.source}` : ''}
                  </p>
                </div>
                <div className="admin-chart__actions">
                  <button type="button" className="admin-export" onClick={refreshState} disabled={isRefreshing}>
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                  </button>
                  <button type="button" className="admin-export" onClick={exportHistory}>
                    Export CSV
                  </button>
                </div>
              </div>

              <div className="admin-chart__canvas">
                <div className="admin-chart__grid" aria-hidden="true" />
                <div className="admin-chart__bars" aria-hidden="true">
                  {(chartBars.length ? chartBars : [40, 45, 35, 50, 42, 48]).map((height, index) => (
                    <span className="admin-chart__bar" key={`bar-${index}`} style={{ height: `${height}%` }} />
                  ))}
                </div>
                <span className="admin-chart__label">Temperature trend from live telemetry</span>
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  )
}

export default Dashboard
