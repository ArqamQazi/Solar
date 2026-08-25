# Solar Panel Monitoring Dashboard

A premium, production-quality dashboard and IoT solution for monitoring solar panel generation in real-time. Features a beautiful Dark Theme PWA (Progressive Web App) and an ESP32 hardware implementation.

## Architecture Diagram

```text
  [Solar Panel] 
       │
       ▼
 [INA219 Sensor] ◄─── (I2C) ───► [ESP32 Microcontroller]
                                        │
                                        ▼ (WiFi / HTTPS)
                                        │
                              [Firebase Realtime Database]
                                        │
                                        ▼ (WebSockets / onValue)
                                        │
                             [Web Dashboard PWA (HTML/JS)]
                             (Deployed via Firebase Hosting)
```

## 1. Web Dashboard (PWA)

The frontend is a vanilla HTML/CSS/JS Single Page Application (SPA). It is built as a PWA, meaning it can be installed on Android/iOS devices directly from the browser for a native app-like experience.

### Features:
- **Live Dashboard**: Real-time power, voltage, and current with smooth animations.
- **Daily View**: Hourly generation chart for any selected day.
- **Monthly View**: Daily generation chart for any selected month.
- **Demo Mode**: Built-in data generator for testing the UI without hardware.
- **Dark Theme**: Glassmorphism UI, gradient charts, responsive layout.

### Setup & Deployment:
1. Create a Firebase Project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Realtime Database** (Start in test mode or configure rules for authenticated read/write).
3. Go to Project Settings > General > Add Web App. Copy the `firebaseConfig` object.
4. Paste the config into `js/firebase-config.js`.
5. Install Firebase CLI: `npm install -g firebase-tools`
6. Login: `firebase login`
7. Edit `.firebaserc` to include your Project ID.
8. Deploy: `firebase deploy --only hosting`

## 2. Hardware Setup (ESP32)

The hardware component reads DC voltage and current from the solar panel and transmits it to Firebase.

### Components Needed:
- ESP32 Development Board
- INA219 DC Current Sensor Breakout (Adafruit or generic)
- Solar Panel (Max 26V for standard INA219)

### Wiring Diagram:

```text
    ESP32            INA219             SOLAR PANEL
    ┌───────┐        ┌────────┐
    │    3V3├───────►│VCC     │         ┌────────┐
    │    GND├───────►│GND     │         │        │
    │    22 ├───────►│SCL     │         │   V+ ──┼───┐
    │    21 ├───────►│SDA     │         │        │   │
    │       │        │        │         │   V- ──┼─┐ │
    └───────┘        │    VIN+├─────────┘        │ │ │
                     │        │                  │ │ │
                     │    VIN-├────────(To Load)─┘ │ │
                     └────────┘                    │ │
                                      (Load GND)───┘ │
                                                     │
                                      (Load V+)──────┘
```
*Note: The INA219 measures high-side current. VIN+ connects to the positive output of the solar panel, and VIN- connects to the positive side of your load/battery controller.*

### Flashing the ESP32:
1. Open `esp32/solar_monitor.ino` in the Arduino IDE.
2. Install Required Libraries via Library Manager:
   - `Adafruit INA219`
   - `ArduinoJson`
3. Update the WiFi credentials in the sketch.
4. Update the `firebaseHost` and `firebaseAuth` variables with your Firebase Database URL and Database Secret (found in Firebase Console > Project Settings > Service Accounts > Database Secrets).
5. Select your ESP32 board and COM port.
6. Compile and Upload.

## 3. How Data Flows
1. The **ESP32** wakes up, connects to WiFi, and syncs time via NTP.
2. Every 5 seconds, it reads Voltage and Current from the **INA219**. Power is calculated ($P = V \times I$).
3. The ESP32 sends a JSON payload to the `/live` node in **Firebase Realtime Database** via a REST API PUT request.
4. Concurrently, the ESP32 integrates the power over time to calculate Energy (Watt-hours).
5. At the end of every hour, it writes the accumulated hourly energy to the `/hourly/YYYY-MM-DD/HH` node.
6. The **Web Dashboard** listens to the `/live` node using Firebase SDK's `.on('value')`. When the ESP32 updates the database, the UI updates instantly with smooth number animations.

## 4. Troubleshooting
- **No data on Dashboard?** Check your Firebase Database Rules. They might be set to `false`. For testing, set them to `".read": true, ".write": true`.
- **ESP32 not connecting to WiFi?** Ensure you are connecting to a 2.4GHz network, as ESP32 does not support 5GHz.
- **Charts not showing historical data?** Ensure your device's timezone matches the ESP32's timezone. The ESP32 uses NTP to set its internal clock.
- **Demo data button doesn't work?** Open browser developer console (F12) to check for Firebase permission errors or missing config.
