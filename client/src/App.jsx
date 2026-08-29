import { useState } from 'react'
import Dashboard from './ADMIN/dash.jsx'
import Login from './LOGIN/login.jsx'

const AUTH_KEY = 'iot_fire_smoke_authenticated'

function hasActiveSession() {
  if (typeof window === 'undefined') return false

  return window.localStorage.getItem(AUTH_KEY) === 'true' || window.sessionStorage.getItem(AUTH_KEY) === 'true'
}

function App() {
  const [authenticated, setAuthenticated] = useState(hasActiveSession)

  const handleAuthenticate = (remember) => {
    const storage = remember ? window.localStorage : window.sessionStorage
    const otherStorage = remember ? window.sessionStorage : window.localStorage

    otherStorage.removeItem(AUTH_KEY)
    storage.setItem(AUTH_KEY, 'true')
    setAuthenticated(true)
  }

  const handleLogout = () => {
    window.localStorage.removeItem(AUTH_KEY)
    window.sessionStorage.removeItem(AUTH_KEY)
    setAuthenticated(false)
  }

  return authenticated ? (
    <Dashboard onLogout={handleLogout} />
  ) : (
    <Login onAuthenticate={handleAuthenticate} />
  )
}

export default App
