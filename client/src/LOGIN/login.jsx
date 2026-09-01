import { useState } from 'react'
import './style.css'

const API_BASE_CANDIDATES = [
  typeof import.meta !== 'undefined' ? import.meta.env.VITE_API_BASE_URL : '',
  '',
  'http://localhost:5001',
  'http://127.0.0.1:5001',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
]

const logoUrl =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAkHQNrqcBeh4ckSwAfRLWmT2_t43p67FT6oPvNoVED_JpAx5FFIS7RQhAQjUkUw9XC_7JdM-88WiupJvi8d6pNjItCm7985KBv7AQ4i1vRNhlINHf-Cu1d7PeVuyC9Gb-rGWBzTxOLx0Ui4H1CaQ0sYaFXLflcpfoBgjq25Tpn6zk9XDJdvx4V9lyZSMtptO-owx3ZAMel2G4ZoLmtI7T5ngqSEwGmJP53GgxwCBUCcBgfsxeCqyjV'

const DEMO_USERNAME = 'admin@firesafe.local'
const DEMO_PASSWORD = '0147'

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

function Login({ onAuthenticate }) {
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    setErrorMessage('')
    setIsSubmitting(true)

    const normalizedUsername = username.trim().toLowerCase()
    const isDemoLogin =
      normalizedUsername === DEMO_USERNAME && password === DEMO_PASSWORD

    if (isDemoLogin) {
      onAuthenticate?.({
        remember,
        user: {
          id: 1,
          name: 'cinifix',
          email: DEMO_USERNAME,
          role: 'admin',
          status: 'active',
        },
      })
      setIsSubmitting(false)
      return
    }

    try {
      const bases = dedupeBases(API_BASE_CANDIDATES)
      let lastError = null

      for (const base of bases) {
        const controller = new AbortController()
        const timeout = window.setTimeout(() => controller.abort(), 3000)

        try {
          const response = await fetch(buildEndpoint(base, '/api/auth/login'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
            body: JSON.stringify({
              username: username.trim(),
              password,
            }),
          })

          const payload = await response.json().catch(() => null)

          if (!response.ok) {
            if (response.status === 401) {
              setErrorMessage(payload?.message || 'Invalid username or password.')
              return
            }

            lastError = payload?.message || `Login request failed with status ${response.status}.`
            continue
          }

          onAuthenticate?.({
            remember,
            user: payload?.data?.user || null,
          })
          return
        } catch (error) {
          lastError = error?.message || 'Network request failed.'
        } finally {
          window.clearTimeout(timeout)
        }
      }

      setErrorMessage(lastError || 'Unable to reach the authentication server.')
    } catch {
      setErrorMessage('Unable to reach the authentication server.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-shell">
        <div className="login-card">
          <div className="login-status" aria-label="System status">
            <span className="login-status__dot" title="System online" />
            <span className="login-status__text">Active</span>
          </div>

          <header className="login-brand">
            <div className="login-brand__logo">
              <img alt="Lumina SafeGuard logo" src={logoUrl} />
            </div>
            <h1>LOGIN</h1>
            <p>ACDLL SafeGuard</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field-group">
              <label htmlFor="username">Operator ID / Username</label>
              <div className="input-wrap">
              
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="admin@firesafe.local"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="password">Access Protocol</label>
              <div className="input-wrap">
              
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="********"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="form-meta">
              <label className="checkbox">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                <span>Stay connected</span>
              </label>

              <a className="text-link" href="#">
                Recover Access
              </a>
            </div>

            {errorMessage ? <p className="login-error">{errorMessage}</p> : null}

            <div className="form-actions">
              <button type="submit" className="submit-button" disabled={isSubmitting}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  lock
                </span>
                {isSubmitting ? 'Checking Access...' : 'System Access'}
              </button>
            </div>
          </form>

          <footer className="login-footer">
            <span className="login-footer__note">Don't have access?</span>
            <a className="text-link" href="https://www.facebook.com/cinanyag">
              Contact Administrator
            </a>
          </footer>
        </div>
      </div>
    </main>
  )
}

export default Login
