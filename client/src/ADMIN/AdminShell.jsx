import { useState } from 'react'
import { ADMIN_NAV_ITEMS } from './navigation.js'
import './style.css'

function AdminShell({
  activePage = 'dashboard',
  brandTitle = 'GuardianMesh IoT',
  brandSubtitle = 'Live telemetry active',
  children,
  connectionState = 'live',
  onLogout,
  onNavigate,
  onRefresh,
  pageSubtitle,
  pageTitle,
  refreshing = false,
  user,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const closeSidebar = () => setSidebarOpen(false)
  const handleNavigate = (page) => {
    if (page) onNavigate?.(page)
    closeSidebar()
  }

  return (
    <div className={`dashboard-shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className="dashboard-glow" />

      <aside className={`dashboard-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="dashboard-brand">
          <div className="dashboard-brand__mark" aria-hidden="true">
            <span className="material-symbols-outlined">shield_with_heart</span>
          </div>
          <h2>{brandTitle}</h2>
          <p>{brandSubtitle}</p>
        </div>

        <nav className="dashboard-nav" aria-label="Primary">
          {ADMIN_NAV_ITEMS.map((item) => (
            <button
              className={`dashboard-nav__link ${item.page === activePage ? 'is-active' : ''}`}
              key={item.label}
              type="button"
              onClick={() => handleNavigate(item.page)}
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

            <div>
              <div
                style={{
                  color: 'var(--dashboard-primary)',
                  font: "800 1.1rem/1.2 'Manrope', sans-serif",
                  letterSpacing: '-0.03em',
                }}
              >
                {pageTitle || 'Overview'}
              </div>
              {pageSubtitle ? <div style={{ color: 'var(--dashboard-muted)', fontSize: '0.92rem', marginTop: '0.25rem' }}>{pageSubtitle}</div> : null}
            </div>
          </div>

          <div className="dashboard-topbar__actions">
            <div className={`dashboard-connection is-${connectionState}`}>
              {refreshing ? 'refreshing' : connectionState}
            </div>
            {onRefresh ? (
              <button
                className="dashboard-icon-button"
                type="button"
                aria-label="Refresh content"
                onClick={() => onRefresh()}
              >
                <span className={`material-symbols-outlined ${refreshing ? 'is-spinning' : ''}`} aria-hidden="true">
                  refresh
                </span>
              </button>
            ) : null}
            <button className="dashboard-icon-button" type="button" aria-label="Notifications">
              <span className="material-symbols-outlined" aria-hidden="true">
                notifications
              </span>
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

        <main className="dashboard-main">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminShell
