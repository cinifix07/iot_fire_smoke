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
