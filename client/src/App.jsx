import { useState } from 'react'
import Dashboard from './ADMIN/dash.jsx'
import Device from './ADMIN/device.jsx'
import Fire from './ADMIN/fire.jsx'
import Livem from './ADMIN/livem.jsx'
import Sensor from './ADMIN/sensor.jsx'
import Login from './LOGIN/login.jsx'

const AUTH_KEY = 'iot_fire_smoke_authenticated'
const AUTH_USER_KEY = 'iot_fire_smoke_user'

function hasActiveSession() {
  if (typeof window === 'undefined') return false

  return window.localStorage.getItem(AUTH_KEY) === 'true' || window.sessionStorage.getItem(AUTH_KEY) === 'true'
}

function readStoredUser() {
  if (typeof window === 'undefined') return null

  const rawUser = window.localStorage.getItem(AUTH_USER_KEY) || window.sessionStorage.getItem(AUTH_USER_KEY)
  if (!rawUser) return null

  try {
    return JSON.parse(rawUser)
  } catch {
    return null
  }
}

function App() {
  const [authenticated, setAuthenticated] = useState(hasActiveSession)
  const [user, setUser] = useState(readStoredUser)
  const [activePage, setActivePage] = useState('dashboard')

  const handleAuthenticate = ({ remember, user: nextUser }) => {
    const storage = remember ? window.localStorage : window.sessionStorage
    const otherStorage = remember ? window.sessionStorage : window.localStorage

    otherStorage.removeItem(AUTH_KEY)
    otherStorage.removeItem(AUTH_USER_KEY)
    storage.setItem(AUTH_KEY, 'true')
    storage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser || null))
    setAuthenticated(true)
    setUser(nextUser || null)
    setActivePage('dashboard')
  }

  const handleLogout = () => {
    window.localStorage.removeItem(AUTH_KEY)
    window.localStorage.removeItem(AUTH_USER_KEY)
    window.sessionStorage.removeItem(AUTH_KEY)
    window.sessionStorage.removeItem(AUTH_USER_KEY)
    setAuthenticated(false)
    setUser(null)
    setActivePage('dashboard')
  }

  const renderAdminPage = () => {
    const pageProps = {
      activePage,
      onNavigate: setActivePage,
      onLogout: handleLogout,
      user,
    }

    switch (activePage) {
      case 'livem':
        return <Livem {...pageProps} />
      case 'sensor':
        return <Sensor {...pageProps} />
      case 'fire':
        return <Fire {...pageProps} />
      case 'device':
        return <Device {...pageProps} />
      case 'dashboard':
      default:
        return <Dashboard {...pageProps} />
    }
  }

  return authenticated ? (
    renderAdminPage()
  ) : (
    <Login onAuthenticate={handleAuthenticate} />
  )
}

export default App
