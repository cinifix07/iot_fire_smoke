import AdminShell from './AdminShell.jsx'
import useLiveTelemetry from '../hooks/useLiveTelemetry.js'

function LiveMetric({ label, value, tone = 'safe', detail }) {
  return (
    <article className={`livem-metric livem-metric--${tone}`}>
      <div className="livem-metric__label">{label}</div>
      <div className="livem-metric__value">{value}</div>
      {detail ? <div className="livem-metric__detail">{detail}</div> : null}
    </article>
  )
}

function Livem({ activePage = 'livem', onLogout, onNavigate, user }) {
  const { connectionState, error, fireStatus, history, lastUpdated, reading } = useLiveTelemetry()
  const isCritical = fireStatus === 'CRITICAL'
  const isWarning = fireStatus === 'WARNING'
  const heroTone = isCritical ? 'critical' : isWarning ? 'warning' : 'safe'
  const heroIcon = isCritical ? 'local_fire_department' : isWarning ? 'warning' : 'verified_user'
  const heroTitle = isCritical ? 'Fire Detected' : isWarning ? 'Warning Condition' : 'System Secure'
  const recentReadings = history.slice(0, 3)

  return (
    <AdminShell
      activePage={activePage}
      brandSubtitle="Wokwi live feed"
      connectionState="live"
      onLogout={onLogout}
      onNavigate={onNavigate}
      pageTitle="Live Monitoring"
      pageSubtitle="Realtime simulator output streaming into PostgreSQL and the dashboard."
      user={user}
    >
      <style>{`
        .livem-page {
          display: grid;
          gap: 1.1rem;
        }

        .livem-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 1rem;
        }

        .livem-panel {
          border-radius: 1.25rem;
          border: 1px solid rgba(196, 198, 207, 0.3);
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 10px 30px -18px rgba(0, 18, 43, 0.28);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 1.1rem;
        }

        .livem-panel h3 {
          margin: 0;
          color: #00122b;
          font: 800 1rem/1.3 Manrope, sans-serif;
        }

        .livem-hero {
          min-height: 18rem;
          display: grid;
          place-items: center;
          text-align: center;
          padding: 1.5rem;
          background: radial-gradient(circle at center, rgba(176, 221, 255, 0.18), rgba(255, 255, 255, 0.1) 65%);
        }

        .livem-fire {
          width: 6.5rem;
          height: 6.5rem;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: #d61f1f;
          color: #fff;
          box-shadow: 0 0 0 0.8rem rgba(214, 31, 31, 0.08), 0 14px 28px rgba(214, 31, 31, 0.18);
          margin-bottom: 1rem;
        }

        .livem-fire .material-symbols-outlined {
          font-size: 2rem;
        }

        .livem-fire.is-warning {
          background: #a86100;
          box-shadow: 0 0 0 0.8rem rgba(168, 97, 0, 0.08), 0 14px 28px rgba(168, 97, 0, 0.18);
        }

        .livem-fire.is-safe {
          background: #2f7a10;
          box-shadow: 0 0 0 0.8rem rgba(47, 122, 16, 0.08), 0 14px 28px rgba(47, 122, 16, 0.18);
        }

        .livem-hero h2 {
          margin: 0;
          color: #00122b;
          font: 800 clamp(1.8rem, 3vw, 3rem)/1.1 Manrope, sans-serif;
        }

        .livem-hero p {
          margin: 0.6rem 0 0;
          color: #5b6170;
          font: 500 0.98rem/1.6 Manrope, sans-serif;
          max-width: 48rem;
        }

        .livem-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
        }

        .livem-metric {
          border-radius: 1rem;
          padding: 1rem;
          border: 1px solid rgba(196, 198, 207, 0.3);
          background: rgba(255, 255, 255, 0.9);
        }

        .livem-metric__label {
          color: #74777f;
          font: 700 0.72rem/1 'JetBrains Mono', monospace;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .livem-metric__value {
          margin-top: 0.55rem;
          color: #00122b;
          font: 800 clamp(1.5rem, 2vw, 2.1rem)/1.1 Manrope, sans-serif;
        }

        .livem-metric__detail {
          margin-top: 0.35rem;
          color: #5b6170;
          font: 500 0.92rem/1.5 Manrope, sans-serif;
        }

        .livem-metric--safe {
          box-shadow: inset 0 0 0 1px rgba(82, 196, 26, 0.08);
        }

        .livem-metric--warning {
          box-shadow: inset 0 0 0 1px rgba(250, 173, 20, 0.08);
        }

        .livem-log {
          display: grid;
          gap: 0.75rem;
        }

        .livem-log__item {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 0.75rem;
          align-items: start;
        }

        .livem-log__dot {
          width: 0.8rem;
          height: 0.8rem;
          margin-top: 0.4rem;
          border-radius: 999px;
          background: #00122b;
          box-shadow: 0 0 0 6px rgba(0, 18, 43, 0.06);
        }

        .livem-log__time {
          color: #00122b;
          font: 700 0.75rem/1 'JetBrains Mono', monospace;
          letter-spacing: 0.08em;
        }

        .livem-log__text {
          color: #5b6170;
          margin-top: 0.2rem;
          font: 500 0.92rem/1.5 Manrope, sans-serif;
        }

        .livem-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem;
        }

        .livem-chip {
          display: inline-flex;
          align-items: center;
          min-height: 2.1rem;
          padding: 0 0.8rem;
          border-radius: 999px;
          border: 1px solid rgba(196, 198, 207, 0.5);
          background: rgba(245, 243, 246, 0.92);
          color: #00122b;
          font: 700 0.7rem/1 'JetBrains Mono', monospace;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        @media (max-width: 1024px) {
          .livem-grid,
          .livem-metrics {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section className="livem-page">
        <div className="livem-grid">
          <article className="livem-panel livem-hero">
            <div className={`livem-fire is-${heroTone}`} aria-hidden="true">
              <span className="material-symbols-outlined">{heroIcon}</span>
            </div>
            <h2>{heroTitle}</h2>
            <p>
              {error || `Reading ${reading?.id ?? '--'} saved in PostgreSQL and streamed from the Wokwi simulator.`}
            </p>
            <div className="livem-chip-row" style={{ justifyContent: 'center', marginTop: '1.1rem' }}>
              <span className="livem-chip">ESP32 DevKit V1</span>
              <span className="livem-chip">MQ-2 Gas Sensor</span>
              <span className="livem-chip">DHT22 Temperature Sensor</span>
              <span className="livem-chip">SSD1306 OLED</span>
            </div>
          </article>

          <article className="livem-panel">
            <h3>Activity Log</h3>
            <div className="livem-log" style={{ marginTop: '1rem' }}>
              {recentReadings.map((item) => (
                <div className="livem-log__item" key={item.id}>
                  <div className="livem-log__dot" />
                  <div>
                    <div className="livem-log__time">
                      {new Date(item.recorded_at).toLocaleTimeString()}
                    </div>
                    <div className="livem-log__text">
                      Reading #{item.id}: {item.temperature.toFixed(1)} C, {item.smoke_level.toFixed(0)} ppm, {item.humidity?.toFixed(1) ?? '--'} % RH
                    </div>
                  </div>
                </div>
              ))}
              {recentReadings.length === 0 ? <p className="livem-log__text">Waiting for Wokwi telemetry...</p> : null}
            </div>
          </article>
        </div>

        <section className="livem-metrics">
          <LiveMetric
            label="Temperature"
            value={reading ? `${reading.temperature.toFixed(1)} C` : '--'}
            tone={reading?.temperature >= 50 ? 'warning' : 'safe'}
            detail={`Last database update: ${lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'waiting'}`}
          />
          <LiveMetric
            label="Smoke Level"
            value={reading ? `${reading.smoke_level.toFixed(0)} ppm` : '--'}
            tone={reading?.smoke_level >= 1500 ? 'warning' : 'safe'}
            detail="MQ-2 gas sensor output."
          />
          <LiveMetric
            label="Humidity"
            value={reading && reading.humidity !== null ? `${reading.humidity.toFixed(1)} %` : '--'}
            detail={`Connection: ${connectionState}`}
          />
        </section>
      </section>
    </AdminShell>
  )
}

export default Livem
