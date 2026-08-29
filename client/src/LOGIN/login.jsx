import { useState } from 'react'
import './style.css'

const logoUrl =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAkHQNrqcBeh4ckSwAfRLWmT2_t43p67FT6oPvNoVED_JpAx5FFIS7RQhAQjUkUw9XC_7JdM-88WiupJvi8d6pNjItCm7985KBv7AQ4i1vRNhlINHf-Cu1d7PeVuyC9Gb-rGWBzTxOLx0Ui4H1CaQ0sYaFXLflcpfoBgjq25Tpn6zk9XDJdvx4V9lyZSMtptO-owx3ZAMel2G4ZoLmtI7T5ngqSEwGmJP53GgxwCBUCcBgfsxeCqyjV'

function Login({ onAuthenticate }) {
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()

    if (username.trim().toLowerCase() === 'cinifix' && password === '0147') {
      setErrorMessage('')
      onAuthenticate?.(remember)
      return
    }

    setErrorMessage('Invalid username or password.')
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
                  placeholder="cinifix"
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
              <button type="submit" className="submit-button">
                <span className="material-symbols-outlined" aria-hidden="true">
                  lock
                </span>
                System Access
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
