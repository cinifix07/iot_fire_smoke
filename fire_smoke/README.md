# IoT Fire and Smoke Detection System

An ESP32-based fire safety project built with PlatformIO and the Arduino framework.

## Features

- MQ-2 smoke detection
- DHT22 temperature monitoring
- Flame sensor input
- OLED status display
- LED indicators
- Buzzer alarm
- Serial JSON telemetry for integration with an API or dashboard

## Hardware Pins

From `src/main.cpp`:

- MQ-2 smoke sensor: GPIO 34
- Flame sensor: GPIO 35
- DHT22 data pin: GPIO 4
- Green LED: GPIO 14
- Yellow LED: GPIO 27
- Red LED: GPIO 26
- Buzzer: GPIO 25
- Reset button: GPIO 33
- OLED I2C: SDA GPIO 21, SCL GPIO 22

## Thresholds

- Smoke alert threshold: `3000`
- Temperature alert threshold: `50 C`

## How It Works

The device enters a normal monitoring state by default.

- If smoke, temperature, or flame readings cross the threshold, the system enters fire alert mode.
- The buzzer sounds, warning LEDs turn on, and the OLED shows an alert.
- A JSON fire event is printed once when the alarm first triggers.
- Telemetry is printed to Serial once per loop for downstream systems.

## Build And Upload

1. Open the project in PlatformIO.
2. Select the `esp32dev` environment.
3. Build the firmware.
4. Upload to the ESP32 board.
5. Open the serial monitor at `115200` baud.

## Notes

- If the OLED is not detected at `0x3C`, the project keeps running with serial output.
- The code is already structured to be easy to extend with Wi-Fi or API reporting later.
