import { useEffect, useState } from 'react'
import AdminShell from './AdminShell.jsx'
import { createApiClient } from '../services/api.js'

const PAGE_SIZE = 10
const API_BASE_CANDIDATES = [
  typeof import.meta !== 'undefined' ? import.meta.env.VITE_API_BASE_URL : '',
  '',
  'http://127.0.0.1:5001',
  'http://localhost:5001',
]
const SEVERITY_FILTERS = [
  { label: 'Severity: All', value: '' },
  { label: 'Emergency', value: 'CRITICAL' },
  { label: 'Warning', value: 'WARNING' },
  { label: 'Info', value: 'INFO' },
]

function severityLabel(severity) {
  if (String(severity).toUpperCase() === 'CRITICAL') return 'Emergency'
  if (String(severity).toUpperCase() === 'WARNING') return 'Warning'
  return 'Info'
}

function severityTone(severity) {
  if (String(severity).toUpperCase() === 'CRITICAL') return 'danger'
  if (String(severity).toUpperCase() === 'WARNING') return 'warning'
  return 'info'
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium' })
}

function visiblePages(currentPage, totalPages) {
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
  const end = Math.min(totalPages, start + 4)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function Fire({ activePage = 'fire', onLogout, onNavigate, user }) {
  const [events, setEvents] = useState([])
  const [page, setPage] = useState(1)
  const [severity, setSeverity] = useState('')
  const [pagination, setPagination] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 })
  const [connectionState, setConnectionState] = useState('connecting')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let disposed = false

    const loadEvents = async () => {
      for (const base of [...new Set(API_BASE_CANDIDATES)]) {
        try {
          const client = createApiClient(base, { timeout: 4000 })
          const response = await client.get('/api/fire-events', {
            params: { limit: PAGE_SIZE, page, severity: severity || undefined },
          })

          if (disposed) return
          setEvents(Array.isArray(response.data?.data) ? response.data.data : [])
          setPagination(response.data?.pagination || { page, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 })
          setConnectionState('live')
          setError(null)
          setLoading(false)
          return
        } catch {
          // Try the next local backend candidate.
        }
      }

      if (!disposed) {
        setConnectionState('offline')
        setError('Unable to load fire events from PostgreSQL.')
        setLoading(false)
      }
    }

    void loadEvents()
    const intervalId = window.setInterval(loadEvents, 5000)

    return () => {
      disposed = true
      window.clearInterval(intervalId)
    }
  }, [page, severity])

  const firstItem = pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1
  const lastItem = Math.min(pagination.page * pagination.pageSize, pagination.totalItems)

  const selectSeverity = (value) => {
    setLoading(true)
    setSeverity(value)
    setPage(1)
  }

  const selectPage = (nextPage) => {
    setLoading(true)
    setPage(nextPage)
  }

  return (
    <AdminShell
      activePage={activePage}
      brandSubtitle="Event history & logs"
      connectionState={connectionState}
      onLogout={onLogout}
      onNavigate={onNavigate}
      pageTitle="Event History & Logs"
      pageSubtitle="Comprehensive audit trail loaded directly from PostgreSQL fire_events."
      user={user}
    >
      <style>{`
        .fire-page { display: grid; gap: 1.1rem; }
        .fire-actions { display: flex; justify-content: flex-end; gap: 0.75rem; flex-wrap: wrap; }
        .fire-button { border: 0; border-radius: 0.85rem; min-height: 2.8rem; padding: 0 1rem; cursor: pointer; font: 700 0.78rem/1 'JetBrains Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase; }
        .fire-button--secondary { background: #fff; color: #356381; border: 1px solid rgba(53, 99, 129, 0.25); }
        .fire-button--primary { background: #00122b; color: #fff; }
        .fire-panel { border-radius: 1.25rem; border: 1px solid rgba(196, 198, 207, 0.3); background: rgba(255, 255, 255, 0.82); box-shadow: 0 10px 30px -18px rgba(0, 18, 43, 0.28); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); overflow: hidden; }
        .fire-filterbar { display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: space-between; align-items: center; padding: 1rem 1.1rem; border-bottom: 1px solid rgba(196, 198, 207, 0.25); }
        .fire-filterbar__group { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
        .fire-chip { display: inline-flex; align-items: center; min-height: 2.2rem; padding: 0 0.9rem; border-radius: 999px; border: 1px solid rgba(196, 198, 207, 0.45); background: rgba(245, 243, 246, 0.92); color: #00122b; cursor: pointer; font: 700 0.72rem/1 'JetBrains Mono', monospace; letter-spacing: 0.05em; text-transform: uppercase; }
        .fire-chip.is-active { border-color: #356381; background: #00122b; color: #fff; }
        .fire-table-wrap { overflow-x: auto; }
        .fire-table { width: 100%; border-collapse: collapse; min-width: 920px; }
        .fire-table th, .fire-table td { padding: 0.9rem 1rem; text-align: left; border-bottom: 1px solid rgba(196, 198, 207, 0.18); }
        .fire-table th { color: #74777f; font: 700 0.72rem/1 'JetBrains Mono', monospace; letter-spacing: 0.12em; text-transform: uppercase; background: rgba(245, 243, 246, 0.45); }
        .fire-table td { color: #1b1b1e; font: 500 0.93rem/1.5 Manrope, sans-serif; vertical-align: top; }
        .fire-table__message { padding: 2rem !important; text-align: center !important; color: #5b6170 !important; }
        .fire-description { max-width: 30rem; color: #5b6170; }
        .fire-badge { display: inline-flex; align-items: center; min-height: 1.8rem; padding: 0 0.7rem; border-radius: 999px; font: 700 0.68rem/1 'JetBrains Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase; }
        .fire-badge--danger { color: #ba1a1a; background: rgba(255, 218, 214, 0.8); border: 1px solid rgba(186, 26, 26, 0.16); }
        .fire-badge--warning { color: #8a5a00; background: rgba(255, 233, 193, 0.75); border: 1px solid rgba(138, 90, 0, 0.16); }
        .fire-badge--info { color: #356381; background: rgba(176, 221, 255, 0.5); border: 1px solid rgba(53, 99, 129, 0.16); }
        .fire-footer { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; padding: 0.95rem 1.1rem; border-top: 1px solid rgba(196, 198, 207, 0.25); color: #5b6170; font: 600 0.86rem/1.4 Manrope, sans-serif; }
        .fire-pagination { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
        .fire-page-button { min-width: 2.35rem; min-height: 2.35rem; padding: 0 0.65rem; border-radius: 0.7rem; border: 1px solid rgba(53, 99, 129, 0.25); background: #fff; color: #356381; cursor: pointer; font: 700 0.72rem/1 'JetBrains Mono', monospace; }
        .fire-page-button.is-active { background: #00122b; border-color: #00122b; color: #fff; }
        .fire-page-button:disabled { cursor: not-allowed; opacity: 0.4; }
        @media (max-width: 780px) { .fire-table { min-width: 760px; } }
      `}</style>

      <section className="fire-page">
        <div className="fire-actions">
          <button className="fire-button fire-button--secondary" type="button">Export CSV</button>
          <button className="fire-button fire-button--primary" type="button">Export PDF</button>
        </div>

        <article className="fire-panel">
          <div className="fire-filterbar">
            <div className="fire-filterbar__group" aria-label="Filter events by severity">
              {SEVERITY_FILTERS.map((filter) => (
                <button
                  className={`fire-chip ${severity === filter.value ? 'is-active' : ''}`}
                  key={filter.value || 'all'}
                  onClick={() => selectSeverity(filter.value)}
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <span className="fire-chip is-active">10 rows per page</span>
          </div>

          <div className="fire-table-wrap">
            <table className="fire-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Device ID</th>
                  <th>Event Type</th>
                  <th>Severity</th>
                  <th>Date/Time</th>
                  <th>Details / Action</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="fire-table__message" colSpan="7">Loading PostgreSQL fire events...</td></tr>
                ) : error ? (
                  <tr><td className="fire-table__message" colSpan="7">{error}</td></tr>
                ) : events.length === 0 ? (
                  <tr><td className="fire-table__message" colSpan="7">No fire events found for this filter.</td></tr>
                ) : events.map((event) => (
                  <tr key={event.id}>
                    <td>EVT-{event.id}</td>
                    <td>ESP32-{event.device_id}</td>
                    <td>{String(event.event_type || 'Event').replaceAll('_', ' ')}</td>
                    <td><span className={`fire-badge fire-badge--${severityTone(event.severity)}`}>{severityLabel(event.severity)}</span></td>
                    <td>{formatDate(event.detected_at)}</td>
                    <td><div className="fire-description">{event.description || `Sensor reading #${event.reading_id}`}</div></td>
                    <td>{event.status || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="fire-footer">
            <span>Showing <strong>{firstItem}-{lastItem}</strong> of <strong>{pagination.totalItems}</strong> events</span>
            <nav className="fire-pagination" aria-label="Fire event pages">
              <button className="fire-page-button" disabled={page <= 1} onClick={() => selectPage(page - 1)} type="button">Prev</button>
              {visiblePages(page, pagination.totalPages).map((pageNumber) => (
                <button
                  aria-current={pageNumber === page ? 'page' : undefined}
                  className={`fire-page-button ${pageNumber === page ? 'is-active' : ''}`}
                  key={pageNumber}
                  onClick={() => selectPage(pageNumber)}
                  type="button"
                >
                  {pageNumber}
                </button>
              ))}
              <button className="fire-page-button" disabled={page >= pagination.totalPages} onClick={() => selectPage(page + 1)} type="button">Next</button>
            </nav>
          </div>
        </article>
      </section>
    </AdminShell>
  )
}

export default Fire
