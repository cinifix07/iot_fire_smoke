import { useEffect, useState } from 'react'
import { createApiClient } from '../services/api.js'

const API_BASE_CANDIDATES = [
  typeof import.meta !== 'undefined' ? import.meta.env.VITE_API_BASE_URL : '',
  '',
  'http://127.0.0.1:5001',
  'http://localhost:5001',
]

const INITIAL_STATE = {
  connectionState: 'connecting',
  error: null,
  fireStatus: 'NO_DATA',
  history: [],
  lastUpdated: null,
  reading: null,
}

function dedupeBases(bases) {
  return bases.filter((base, index) => bases.indexOf(base) === index)
}

function buildEndpoint(base, path) {
  return base ? `${base}${path}` : path
}

function normalizeReading(reading) {
  if (!reading) return null

  return {
    ...reading,
    flame_detected: Boolean(reading.flame_detected),
    humidity: reading.humidity === null ? null : Number(reading.humidity),
    smoke_level: Number(reading.smoke_level),
    temperature: Number(reading.temperature),
  }
}

export default function useLiveTelemetry() {
  const [telemetry, setTelemetry] = useState(INITIAL_STATE)

  useEffect(() => {
    let disposed = false
    let refreshInFlight = false
    let stream = null
    let streamBase = null

    const openStream = (base, refresh) => {
      if (streamBase === base && stream) return

      stream?.close()
      streamBase = base
      stream = new EventSource(buildEndpoint(base, '/api/dashboard/live'))
      stream.addEventListener('dashboard-update', refresh)
      stream.onopen = () => {
        if (!disposed) {
          setTelemetry((current) => ({ ...current, connectionState: 'live', error: null }))
        }
      }
      stream.onerror = () => {
        if (!disposed) {
          setTelemetry((current) => ({ ...current, connectionState: 'reconnecting' }))
        }
      }
    }

    const refresh = async () => {
      if (refreshInFlight) return
      refreshInFlight = true

      try {
        for (const base of dedupeBases(API_BASE_CANDIDATES)) {
          try {
            const client = createApiClient(base, { timeout: 4000 })
            const [statusResponse, readingsResponse] = await Promise.all([
              client.get('/api/dashboard/status'),
              client.get('/api/readings?limit=12'),
            ])

            if (disposed) return

            const statusData = statusResponse.data?.data || {}
            const history = Array.isArray(readingsResponse.data?.data)
              ? readingsResponse.data.data.map(normalizeReading)
              : []
            const reading = normalizeReading(statusData.latest_reading || history[0] || null)

            setTelemetry({
              connectionState: 'live',
              error: null,
              fireStatus: statusData.fire_status || 'NO_DATA',
              history,
              lastUpdated: reading?.recorded_at || null,
              reading,
            })
            openStream(base, refresh)
            return
          } catch {
            // Try the next local API candidate.
          }
        }

        if (!disposed) {
          setTelemetry((current) => ({
            ...current,
            connectionState: 'offline',
            error: 'Live telemetry API is unavailable.',
          }))
        }
      } finally {
        refreshInFlight = false
      }
    }

    void refresh()
    const intervalId = window.setInterval(refresh, 5000)

    return () => {
      disposed = true
      stream?.close()
      window.clearInterval(intervalId)
    }
  }, [])

  return telemetry
}
