import AdminShell from './AdminShell.jsx'
import useLiveTelemetry from '../hooks/useLiveTelemetry.js'

function formatTrend(current, previous, suffix) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 'Waiting'
  const difference = current - previous
  return `${difference >= 0 ? '+' : ''}${difference.toFixed(1)} ${suffix}`
}

function Sensor({ activePage = 'sensor', onLogout, onNavigate, user }) {
  const { connectionState, error, history, reading } = useLiveTelemetry()
  const previous = history[1] || null
  const sensorRows = [
    {
      name: 'Temperature',
      value: reading ? `${reading.temperature.toFixed(1)} C` : '--',
      status: reading?.temperature >= 50 ? 'Warning' : 'Nominal',
      trend: formatTrend(reading?.temperature, previous?.temperature, 'C'),
    },
    {
      name: 'Smoke',
      value: reading ? `${reading.smoke_level.toFixed(0)} ppm` : '--',
      status: reading?.smoke_level >= 3000 ? 'Alert' : reading?.smoke_level >= 1500 ? 'Warning' : 'Safe',
      trend: formatTrend(reading?.smoke_level, previous?.smoke_level, 'ppm'),
    },
    {
      name: 'Humidity',
      value: reading && reading.humidity !== null ? `${reading.humidity.toFixed(1)} %` : '--',
      status: reading?.humidity < 30 || reading?.humidity > 70 ? 'Warning' : 'Nominal',
      trend: formatTrend(reading?.humidity, previous?.humidity, '%'),
    },
    {
      name: 'Flame',
      value: reading?.flame_detected ? 'Detected' : 'Clear',
      status: reading?.flame_detected ? 'Alert' : 'Safe',
      trend: reading?.flame_detected ? 'Immediate' : 'Stable',
    },
  ]
  const temperatureHistory = [...history.slice(0, 8)].reverse()
  const temperatures = temperatureHistory.map((item) => item.temperature)
  const minimumTemperature = temperatures.length ? Math.min(...temperatures) : 0
  const maximumTemperature = temperatures.length ? Math.max(...temperatures) : 1
  const temperatureSpread = Math.max(maximumTemperature - minimumTemperature, 1)

  return (
    <AdminShell
      activePage={activePage}
      brandSubtitle="Sensor analytics"
      connectionState={connectionState}
      onLogout={onLogout}
      onNavigate={onNavigate}
      pageTitle="Sensor Data"
      pageSubtitle="Current telemetry snapshot and recent sensor readings from the Wokwi bench."
      user={user}
    >
      <style>{`
        .sensor-page {
          display: grid;
          gap: 1.1rem;
        }

        .sensor-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
        }

        .sensor-card {
          border-radius: 1.2rem;
          border: 1px solid rgba(196, 198, 207, 0.3);
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 10px 30px -18px rgba(0, 18, 43, 0.28);
          padding: 1rem;
        }

        .sensor-card__label {
          color: #74777f;
          font: 700 0.72rem/1 'JetBrains Mono', monospace;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .sensor-card__value {
          margin-top: 0.6rem;
          color: #00122b;
          font: 800 clamp(1.4rem, 2vw, 2rem)/1.1 Manrope, sans-serif;
        }

        .sensor-card__status {
          margin-top: 0.35rem;
          display: inline-flex;
          align-items: center;
          min-height: 1.8rem;
          padding: 0 0.7rem;
          border-radius: 999px;
          font: 700 0.68rem/1 'JetBrains Mono', monospace;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: rgba(176, 221, 255, 0.45);
          color: #356381;
        }

        .sensor-card__status.is-alert {
          background: rgba(255, 218, 214, 0.82);
          color: #ba1a1a;
        }

        .sensor-layout {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 1rem;
        }

        .sensor-panel {
          border-radius: 1.2rem;
          border: 1px solid rgba(196, 198, 207, 0.3);
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 10px 30px -18px rgba(0, 18, 43, 0.28);
          padding: 1rem;
        }

        .sensor-panel h3 {
          margin: 0;
          color: #00122b;
          font: 800 1rem/1.3 Manrope, sans-serif;
        }

        .sensor-bars {
          display: flex;
          align-items: end;
          gap: 0.75rem;
          height: 18rem;
          margin-top: 1rem;
          padding: 1rem 0.5rem 0;
        }

        .sensor-bar {
          flex: 1;
          display: grid;
          gap: 0.5rem;
          justify-items: center;
        }

        .sensor-bar__fill {
          width: 100%;
          min-height: 2rem;
          border-radius: 0.8rem 0.8rem 0.25rem 0.25rem;
          background: linear-gradient(180deg, rgba(53, 99, 129, 0.95), rgba(176, 221, 255, 0.45));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }

        .sensor-bar__label {
          color: #74777f;
          font: 700 0.72rem/1 'JetBrains Mono', monospace;
          letter-spacing: 0.08em;
        }

        .sensor-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }

        .sensor-table th,
        .sensor-table td {
          padding: 0.85rem 0.7rem;
          border-bottom: 1px solid rgba(196, 198, 207, 0.18);
          text-align: left;
        }

        .sensor-table th {
          color: #74777f;
          font: 700 0.72rem/1 'JetBrains Mono', monospace;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .sensor-table td {
          color: #1b1b1e;
          font: 500 0.94rem/1.5 Manrope, sans-serif;
        }

        .sensor-note {
          margin-top: 0.9rem;
          color: #5b6170;
          font: 500 0.92rem/1.6 Manrope, sans-serif;
        }

        @media (max-width: 1080px) {
          .sensor-grid,
          .sensor-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section className="sensor-page">
        <div className="sensor-grid">
          {sensorRows.map((row) => (
            <article className="sensor-card" key={row.name}>
              <div className="sensor-card__label">{row.name}</div>
              <div className="sensor-card__value">{row.value}</div>
              <div className={`sensor-card__status ${row.status === 'Alert' ? 'is-alert' : ''}`}>{row.status}</div>
              <div className="sensor-note">Trend: {row.trend}</div>
            </article>
          ))}
        </div>

        <div className="sensor-layout">
          <section className="sensor-panel">
            <h3>Temperature Stability (12h)</h3>
            <div className="sensor-bars" aria-hidden="true">
              {temperatureHistory.map((item) => {
                const height = 24 + ((item.temperature - minimumTemperature) / temperatureSpread) * 72
                return (
                <div className="sensor-bar" key={item.id} title={`${item.temperature.toFixed(1)} C`}>
                  <div className="sensor-bar__fill" style={{ height: `${height}%` }} />
                  <span className="sensor-bar__label">{new Date(item.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                )
              })}
            </div>
            <p className="sensor-note">{error || `Reading #${reading?.id ?? '--'} loaded from PostgreSQL.`}</p>
          </section>

          <section className="sensor-panel">
            <h3>Sensor Summary</h3>
            <table className="sensor-table">
              <thead>
                <tr>
                  <th>Sensor</th>
                  <th>Reading</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sensorRows.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.value}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="sensor-note">These labels match the Wokwi diagram so the dashboard stays aligned with the simulation.</p>
          </section>
        </div>
      </section>
    </AdminShell>
  )
}

export default Sensor
