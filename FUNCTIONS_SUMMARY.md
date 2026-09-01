# Functions Summary

This file gives a quick reference for the named functions in the IoT Fire Smoke project.

## Client

### `client/src/App.jsx`
- `hasActiveSession()` - checks local or session storage for an active login flag.
- `readStoredUser()` - reads and parses the saved user profile from browser storage.
- `App()` - top-level client controller that switches between login and admin pages.

### `client/src/LOGIN/login.jsx`
- `dedupeBases(bases)` - removes duplicate API base URLs while preserving the preferred empty base entry.
- `buildEndpoint(base, path)` - joins a base URL and route path.
- `Login()` - login page component that authenticates the user and stores session state.

### `client/src/ADMIN/AdminShell.jsx`
- `AdminShell()` - shared admin layout with sidebar, top bar, and page shell behavior.

### `client/src/ADMIN/dash.jsx`
- `toNumber(value, fallback)` - safely converts a value to a number.
- `toBoolean(value, fallback)` - safely converts common truthy and falsey values to booleans.
- `normalizeTimestamp(value, fallback)` - normalizes timestamps from numbers or date strings.
- `dedupeBases(bases)` - removes duplicate backend base URLs.
- `buildEndpoint(base, path)` - builds API URLs from base and path.
- `formatClock(value)` - formats a timestamp as a short clock time.
- `formatLongDate(value)` - formats a timestamp as a human-readable date/time.
- `formatShortClock(value)` - formats a timestamp as a compact clock label.
- `buildSeries(history, key)` - turns historical readings into chart-ready data points.
- `calculateRisk(telemetry, activeAlarms)` - computes the dashboard risk level and recommendation.
- `buildSnapshot(statusPayload, historyPayload, notificationsPayload, devicesPayload, alarmsPayload)` - converts API payloads into the dashboard snapshot model.
- `buildOfflineSnapshot()` - creates a fallback snapshot when the backend is unavailable.
- `StatusCard()` - reusable metric card component.
- `Dashboard()` - main admin dashboard screen and data orchestration component.

### `client/src/ADMIN/device.jsx`
- `Field()` - reusable form field wrapper with label, content, and optional hint.
- `Device()` - device registration screen with provisioning form and summary panel.

### `client/src/ADMIN/fire.jsx`
- `severityTone(severity)` - maps event severity labels to UI tones.
- `Fire()` - fire event history screen with table, filters, and export actions.

### `client/src/ADMIN/livem.jsx`
- `LiveMetric()` - metric card component for the live monitoring view.
- `Livem()` - live telemetry screen showing alerts, status cards, and activity log.

### `client/src/ADMIN/sensor.jsx`
- `Sensor()` - sensor analytics page with summary cards, chart bars, and readings table.

### `client/src/services/api.js`
- `createApiClient(baseURL, config)` - creates an Axios client with a shared timeout and JSON headers.

## Server

### `server/api.js`
- `normalizeBaseURL(baseURL)` - trims trailing slashes from a base URL.
- `buildURL(baseURL, path)` - joins the base URL with a path safely.
- `createApiClient(baseURL, config)` - builds a small fetch-based API helper with timeout support and HTTP verbs.

### `server/auth-utils.js`
- `hashPassword(password)` - hashes passwords for storage.
- `verifyPassword(password, storedHash)` - checks a password against a stored hash.

### `server/live-stream.js`
- `writeEvent(res, eventName, data)` - writes a server-sent event payload to a response stream.
- `subscribe(req, res)` - registers a client for the live event stream.
- `publish(eventName, data)` - broadcasts an event to all connected subscribers.

### `server/server.js`
- `ensureSensorReadingsHumidityColumn()` - makes sure the readings table has a humidity column.
- `startServer()` - checks the database, seeds the default admin user, and starts the Express app.

### `server/routes/readings.js`
- `parseLimit(value, fallback, max)` - parses and clamps pagination limits.
- `parseBoolean(value)` - converts request values into booleans.
- `normalizeOptionalNumber(value)` - converts optional numeric inputs safely.
- `getFireStatus(smokeLevel, temperature, flameDetected)` - calculates the fire status from sensor values.
- `buildFireDescription(fireStatus, smokeLevel, temperature, flameDetected)` - creates a readable event description.

### `server/routes/alarms.js`
- `parseLimit(value, fallback, max)` - parses and clamps pagination limits for alarm queries.
- `parseBoolean(value)` - converts request values into booleans.

### `server/routes/devices.js`
- `parseLimit(value, fallback, max)` - parses and clamps pagination limits for device queries.

### `server/routes/fireEvents.js`
- `parseLimit(value, fallback, max)` - parses and clamps pagination limits for fire event queries.

### `server/routes/notifications.js`
- `parseLimit(value, fallback, max)` - parses and clamps pagination limits for notification queries.

### `server/routes/users.js`
- `parseLimit(value, fallback, max)` - parses and clamps pagination limits for user queries.

### `server/routes/dashboard.js`
- This module is route-driven and mostly relies on inline handlers to assemble the dashboard snapshot, recent events, trends, and live status response.

### `server/routes/auth.js`
- This module is route-driven and handles login/session-related requests with inline route handlers.

## Notes

- The summary focuses on named functions and the main route modules.
- Some Express routes use anonymous inline handlers, so those are summarized at the module level.
