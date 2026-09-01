# IoT Fire Smoke Monorepo

This repository contains the full fire and smoke project workspace:

- `client` - React/Vite frontend
- `server` - Node/Express backend
- `fire_smoke` - ESP32 PlatformIO firmware
- `template` - HTML templates for login/admin pages

## Project Layout

### `client`
Frontend app built with Vite and React.

Scripts:

- `npm run dev` - start the development server
- `npm run build` - build for production
- `npm run lint` - run Oxlint
- `npm run preview` - preview the production build

### `server`
Backend API service built with Express.

Scripts:

- `npm run dev` - start the server in development mode
- `npm start` - start the server

### `fire_smoke`
ESP32 firmware for the fire and smoke detection system.

Features:

- MQ-2 smoke sensor
- DHT22 temperature sensor
- Flame sensor
- OLED display
- buzzer and LED alerts
- serial telemetry output

Build with PlatformIO:

- open `fire_smoke` in PlatformIO
- select the `esp32dev` environment
- run `pio run`

### Wokwi connection modes

The simulator can feed the dashboard in two ways:

- Local mode: keep the backend on your PC and use `http://host.wokwi.internal:5001` from Wokwi or `http://localhost:5001` from the browser
- Cloud mode: point the firmware at a public tunnel or hosted API URL, then rebuild the firmware

Local development uses port `5001` for the HTTP API and port `5002` for Wokwi's RFC2217 serial server. These ports must remain different.

If you change the backend URL, update:

- `fire_smoke/platformio.ini` for the ESP32 firmware
- `client/.env` or `VITE_API_BASE_URL` if you want the browser dashboard to use the same hosted backend directly

Wokwi loads the compiled firmware from `fire_smoke/.pio/build/esp32dev/firmware.bin`.
Run `pio run -e esp32dev` in the `fire_smoke` folder before starting the simulator so the binary exists.

### `template`
Static HTML templates for the login and admin UI.

## Git Ignore Rules

The root `.gitignore` keeps generated and local-only folders out of Git:

- `node_modules/`
- `dist/`
- `.pio/`
- `.platformio/`
- `.platformio-home/`
- `.vscode/`

## Notes

- The repository is organized as a monorepo so all related app folders live in one Git history.
- The embedded project also has its own focused README inside `fire_smoke/`.
