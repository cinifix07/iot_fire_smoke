import { useState } from 'react'
import AdminShell from './AdminShell.jsx'

function Field({ label, children, hint }) {
  return (
    <label className="device-field">
      <span className="device-field__label">{label}</span>
      {children}
      {hint ? <span className="device-field__hint">{hint}</span> : null}
    </label>
  )
}

function Device({ activePage = 'device', onLogout, onNavigate, user }) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <AdminShell
      activePage={activePage}
      brandSubtitle="Device provisioning"
      connectionState="live"
      onLogout={onLogout}
      onNavigate={onNavigate}
      pageTitle="Register New IoT Device"
      pageSubtitle="Provision a new ESP32 node to the GuardianMesh network."
      user={user}
    >
      <style>{`
        .device-page {
          display: grid;
          gap: 1.25rem;
        }

        .device-hero {
          border-radius: 1.25rem;
          padding: 1.35rem 1.45rem;
          border: 1px solid rgba(196, 198, 207, 0.3);
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 10px 30px -18px rgba(0, 18, 43, 0.28);
        }

        .device-hero h2 {
          margin: 0;
          color: #00122b;
          font: 800 clamp(1.5rem, 2vw, 2.2rem)/1.15 Manrope, sans-serif;
        }

        .device-hero p {
          margin: 0.55rem 0 0;
          color: #5b6170;
          font: 500 0.98rem/1.6 Manrope, sans-serif;
        }

        .device-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(18rem, 0.9fr);
          gap: 1rem;
        }

        .device-card {
          border-radius: 1.25rem;
          border: 1px solid rgba(196, 198, 207, 0.3);
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 10px 30px -18px rgba(0, 18, 43, 0.28);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 1.1rem;
        }

        .device-card h3 {
          margin: 0 0 1rem;
          color: #00122b;
          font: 800 1rem/1.3 Manrope, sans-serif;
        }

        .device-form {
          display: grid;
          gap: 1rem;
        }

        .device-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.9rem;
        }

        .device-field {
          display: grid;
          gap: 0.35rem;
        }

        .device-field__label {
          color: #74777f;
          font: 700 0.72rem/1 'JetBrains Mono', monospace;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .device-field__hint {
          color: #74777f;
          font: 500 0.8rem/1.4 Manrope, sans-serif;
        }

        .device-input,
        .device-select {
          width: 100%;
          min-height: 3rem;
          border: 1px solid rgba(196, 198, 207, 0.55);
          border-radius: 0.85rem;
          padding: 0.75rem 0.95rem;
          background: #faf9fc;
          color: #00122b;
          font: 500 0.95rem/1.4 Manrope, sans-serif;
          outline: none;
        }

        .device-input:focus,
        .device-select:focus {
          border-color: rgba(53, 99, 129, 0.6);
          box-shadow: 0 0 0 3px rgba(176, 221, 255, 0.45);
        }

        .device-password {
          position: relative;
        }

        .device-password button {
          position: absolute;
          right: 0.45rem;
          top: 50%;
          transform: translateY(-50%);
          border: 0;
          background: transparent;
          color: #74777f;
          cursor: pointer;
        }

        .device-stack {
          display: grid;
          gap: 0.9rem;
        }

        .device-chip-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem;
        }

        .device-chip {
          display: inline-flex;
          align-items: center;
          min-height: 2.2rem;
          padding: 0 0.85rem;
          border-radius: 999px;
          border: 1px solid rgba(196, 198, 207, 0.5);
          background: rgba(245, 243, 246, 0.9);
          color: #00122b;
          font: 700 0.72rem/1 'JetBrains Mono', monospace;
          letter-spacing: 0.05em;
        }

        .device-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.8rem;
          flex-wrap: wrap;
        }

        .device-button {
          border: 0;
          border-radius: 0.85rem;
          min-height: 2.9rem;
          padding: 0 1rem;
          cursor: pointer;
          font: 700 0.78rem/1 'JetBrains Mono', monospace;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .device-button--secondary {
          background: #fff;
          color: #356381;
          border: 1px solid rgba(53, 99, 129, 0.25);
        }

        .device-button--primary {
          background: #00122b;
          color: #fff;
          box-shadow: 0 10px 20px rgba(0, 18, 43, 0.18);
        }

        .device-summary {
          display: grid;
          gap: 0.9rem;
        }

        .device-summary__panel {
          display: grid;
          gap: 0.65rem;
          padding: 1rem;
          border-radius: 1rem;
          background: linear-gradient(180deg, rgba(176, 221, 255, 0.18), rgba(255, 255, 255, 0.82));
          border: 1px solid rgba(196, 198, 207, 0.3);
        }

        .device-summary__title {
          margin: 0;
          color: #00122b;
          font: 800 0.95rem/1.3 Manrope, sans-serif;
        }

        .device-summary__text {
          margin: 0;
          color: #5b6170;
          font: 500 0.92rem/1.6 Manrope, sans-serif;
        }

        .device-summary__stat {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.8rem 0;
          border-top: 1px solid rgba(196, 198, 207, 0.35);
          color: #00122b;
          font: 700 0.92rem/1.3 Manrope, sans-serif;
        }

        .device-summary__stat span:last-child {
          color: #356381;
        }

        @media (max-width: 900px) {
          .device-layout,
          .device-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section className="device-page">
        <div className="device-hero">
          <h2>Register a New Device</h2>
          <p>Provision an ESP32 node, attach its sensors, and assign the location that will appear in the dashboard.</p>
        </div>

        <div className="device-layout">
          <form className="device-card device-form" onSubmit={(event) => event.preventDefault()}>
            <div className="device-stack">
              <section>
                <h3>Hardware Specifications</h3>
                <div className="device-grid">
                  <Field label="Device Serial Number">
                    <input className="device-input" placeholder="e.g. ESP32-MAC-A1B2C3" type="text" />
                  </Field>
                  <Field label="Hardware Model">
                    <select className="device-select" defaultValue="">
                      <option value="" disabled>
                        Select model
                      </option>
                      <option value="esp32-wroom">ESP32-WROOM</option>
                      <option value="esp32-s3">ESP32-S3</option>
                      <option value="esp32-c3">ESP32-C3</option>
                      <option value="esp8266">ESP8266 (Legacy)</option>
                    </select>
                  </Field>
                  <Field label="Initial Firmware Version">
                    <input className="device-input" placeholder="v2.4.1-stable" type="text" />
                  </Field>
                  <Field label="Installation Location" hint="Use a specific, descriptive location for emergency routing.">
                    <input className="device-input" placeholder="Floor 1 - North Wing HVAC Room" type="text" />
                  </Field>
                </div>
              </section>

              <section>
                <h3>Network Credentials</h3>
                <div className="device-grid">
                  <Field label="Network SSID">
                    <input className="device-input" placeholder="GuardianMesh-Secure" type="text" />
                  </Field>
                  <Field label="Security Key (WPA3)">
                    <div className="device-password">
                      <input
                        className="device-input"
                        placeholder="••••••••••••"
                        type={showPassword ? 'text' : 'password'}
                      />
                      <button aria-label="Toggle security key visibility" type="button" onClick={() => setShowPassword((value) => !value)}>
                        <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </Field>
                </div>
              </section>

              <section>
                <h3>Attached Sensors</h3>
                <div className="device-chip-list">
                  <span className="device-chip">ESP32 DevKit V1</span>
                  <span className="device-chip">MQ-2 Gas Sensor</span>
                  <span className="device-chip">DHT22 Temperature Sensor</span>
                  <span className="device-chip">Flame Sensor</span>
                  <span className="device-chip">SSD1306 OLED</span>
                  <span className="device-chip">Green LED</span>
                  <span className="device-chip">Yellow LED</span>
                  <span className="device-chip">Red LED</span>
                  <span className="device-chip">Buzzer</span>
                  <span className="device-chip">Reset Button</span>
                </div>
              </section>

              <div className="device-actions">
                <button className="device-button device-button--secondary" type="button">
                  Cancel
                </button>
                <button className="device-button device-button--primary" type="submit">
                  Register Device
                </button>
              </div>
            </div>
          </form>

          <aside className="device-summary">
            <div className="device-card device-summary__panel">
              <h3 className="device-summary__title">Deployment Notes</h3>
              <p className="device-summary__text">
                Keep the device name aligned with the simulator labels so the dashboard and Wokwi telemetry map
                cleanly.
              </p>
              <div className="device-summary__stat">
                <span>Simulation</span>
                <span>Wokwi Live</span>
              </div>
              <div className="device-summary__stat">
                <span>Database</span>
                <span>PostgreSQL</span>
              </div>
              <div className="device-summary__stat">
                <span>Telemetry</span>
                <span>Connected</span>
              </div>
            </div>

            <div className="device-card">
              <h3>Wokwi Parts</h3>
              <div className="device-chip-list">
                <span className="device-chip">ESP32 DevKit V1</span>
                <span className="device-chip">MQ-2 Gas Sensor</span>
                <span className="device-chip">DHT22 Temperature Sensor</span>
                <span className="device-chip">Flame Sensor</span>
                <span className="device-chip">SSD1306 OLED</span>
                <span className="device-chip">Green LED</span>
                <span className="device-chip">Yellow LED</span>
                <span className="device-chip">Red LED</span>
                <span className="device-chip">Buzzer</span>
                <span className="device-chip">Reset Button</span>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </AdminShell>
  )
}

export default Device
