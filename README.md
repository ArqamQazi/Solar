# Solar Monitor: Smart IoT Telemetry and Real-Time Dashboard

A production-ready monitoring system and installable Progressive Web Application (PWA) designed for portable solar inverters and off-grid power stations. The system pairs an ESP32 microcontroller and four INA226 power sensors with Google Firebase Realtime Database to deliver high-precision telemetry, multi-period generation analytics, intelligent battery state of charge monitoring, and zero-touch Wi-Fi configuration.

Live Application: https://arqamqazi.github.io/Solar/

---

## Architecture Overview

```text
  +-------------------------------------------------------------------------+
  |                        PORTABLE INVERTER SYSTEM                         |
  |                                                                         |
  |  [Solar Input]       [Battery Bank]       [DC Load]       [AC Inverter] |
  |       |                    |                  |                 |       |
  |       v                    v                  v                 v       |
  |  [INA226 (0x40)]     [INA226 (0x41)]    [INA226 (0x44)]   [INA226 (0x45)]
  |       |                    |                  |                 |       |
  |       +--------------------+------------------+-----------------+       |
  |                                    | (I2C: GPIO 21 / 22)                |
  |                                    v                                    |
  |                         [ESP32 Microcontroller]                         |
  +-------------------------------------------------------------------------+
                                       |
                                       | (Wi-Fi / HTTPS REST PUT)
                                       v
  +-------------------------------------------------------------------------+
  |                      FIREBASE REALTIME DATABASE                         |
  |                                                                         |
  |   * /live      -> Instantaneous 4-channel telemetry (every 5 seconds)   |
  |   * /stats     -> Running today, weekly, monthly, all-time energy       |
  |   * /hourly    -> 24-hour generation profiles by date                   |
  |   * /daily     -> Historical day-by-day logs by month                   |
  |   * /control   -> Remote configuration and Wi-Fi reset commands         |
  +-------------------------------------------------------------------------+
                                       |
                                       | (WebSockets / Push Updates)
                                       v
  +-------------------------------------------------------------------------+
  |                   PROGRESSIVE WEB APPLICATION (PWA)                     |
  |               (Mobile and Desktop Browser / Installable)                |
  |                                                                         |
  |   * Live Power Overview & 4-Stage Telemetry                             |
  |   * Dynamic Battery Percentage by Chemistry (LiFePO4, Lead-Acid, Li-Ion)|
  |   * Generation History: Daily, Weekly, Monthly, and Yearly Analytics    |
  |   * Zero-Touch Wi-Fi Hotspot Detection and In-App Configuration        |
  |   * Offline Service Worker Caching & Simulation Engine                  |
  +-------------------------------------------------------------------------+
```

---

## Key Features

### 1. Four-Stage Live Power Telemetry
Simultaneously tracks instantaneous electrical metrics across all four power stages:
- **Solar Input**: Solar photovoltaic voltage, charging current, and incoming wattage.
- **Battery**: Battery bank voltage, net charge/discharge current, and wattage.
- **DC Load**: Direct current appliances voltage, current consumption, and power.
- **AC Inverter**: Alternating current inverter voltage, draw current, and load wattage.

### 2. Live Battery Percentage by Chemistry
Calculates true battery state of charge using chemical open-circuit voltage curves with piecewise linear interpolation:
- **Lead-Acid / AGM / Gel**: 12V nominal baseline (10.5V empty to 12.8V full).
- **Lithium Iron Phosphate (LiFePO4 4S)**: 12.8V nominal baseline (10.0V empty to 13.6V full).
- **Lithium-Ion / NMC (3S)**: 11.1V nominal baseline (9.0V empty to 12.6V full).
- **Lithium-Ion / NMC (4S)**: 14.8V nominal baseline (12.0V empty to 16.8V full).
- **System Multipliers**: Full scaling support for 12V (1x), 24V (2x), and 48V (4x) setups.
- **Custom Range**: Enter arbitrary minimum (0%) and maximum (100%) cutoffs.
- Visual state of charge bar with green, amber, and red health indicators.

### 3. Multi-Period Generation Analytics
Interactive dual-layer bar and trend charts powered by Chart.js:
- **Daily View**: Hourly generation profiles from 12 AM to 11 PM in Watt-hours, total kWh, and peak watts.
- **Weekly View**: 7-day breakdown (Monday through Sunday) with weekly total, daily average, and best day.
- **Monthly View**: Day-by-day calendar history (days 1 to 31) with monthly harvest and daily yield average.
- **Yearly View**: 12-month annual summary (January through December) with annual total, monthly average, and peak month.
- Quick-toggle period pills (`Daily`, `Weekly`, `Monthly`, `Yearly`) available across all views.

### 4. Zero-Touch Wi-Fi Configuration
Reconfigure Wi-Fi networks when transporting the inverter to field locations without pressing buttons or connecting to a computer:
- **Automatic Hotspot on Disconnect**: When the inverter moves out of range of its saved router, the ESP32 automatically launches an access point named `Solar_Setup`.
- **In-App Hotspot Detection**: The PWA tests connectivity to `http://192.168.4.1` and displays a connection status indicator.
- **Direct Submission**: Enter new credentials inside the PWA to send them straight to the ESP32 setup endpoint.
- **One-Tap Portal**: Link directly to `http://192.168.4.1` for the full Wi-Fi scanner interface.
- **Remote PWA Reset**: When online, dispatch reset commands via Firebase to re-open the setup portal on demand.

### 5. Progressive Web App (PWA) Capabilities
- **Installable**: Add directly to phone home screens or desktop application menus.
- **Subpath Compatible**: Fully configured with relative manifest and service worker scopes for GitHub Pages subpath deployment.
- **Maskable Adaptive Icons**: Includes standard and 80 percent safe-zone maskable icons for Android adaptive launchers.
- **Offline Caching**: Service worker precaches application assets and caches runtime dependencies.
- **High-Contrast Dark Theme**: Glassmorphic UI with amber accents optimized for outdoor visibility and mobile OLED power efficiency.

---

## Hardware Configuration

### Components
1. **ESP32 Development Board**: Dual-core 240 MHz microcontroller with 2.4 GHz Wi-Fi and I2C hardware bus.
2. **Four INA226 Sensor Modules**: High-side DC voltage and current sensing breakout boards with 16-bit ADCs.
3. **Four 50A / 75mV Shunt Resistors**: Precision 0.0015 Ohm shunts placed on the positive rail of each stage.
4. **DC-DC Buck Converter**: Steps down system battery voltage to 5V DC for the microcontroller logic rail.

### I2C Sensor Addressing

| Stage | I2C Address | A1 Pin | A0 Pin | Shunt Resistance | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Solar** | `0x40` | GND | GND | 0.0015 Ohm | Photovoltaic generation input |
| **Battery** | `0x41` | GND | VCC | 0.0015 Ohm | Storage bank charge and discharge |
| **DC Load** | `0x44` | GND | SDA | 0.0015 Ohm | Direct current equipment load |
| **Inverter** | `0x45` | GND | SCL | 0.0015 Ohm | Alternating current inverter supply |

### Microcontroller Pin Mapping
- **GPIO 21**: I2C Data (`SDA`) connected to all INA226 sensor modules.
- **GPIO 22**: I2C Clock (`SCL`) connected to all INA226 sensor modules.
- **3.3V / GND**: Common logic rail and system ground reference.

---

## Firmware Overview

The current production firmware is located in `esp32/sketch_oct22a.ino` and `sketch_oct22a.ino`.

### Firmware Features:
1. **Sensor Calibration**: Applies dedicated hardware offsets (`0.00`, `+0.10`, `-0.55`, `-0.54` V) and filters ghost currents under 0.40 A.
2. **Numerical Energy Integration**: Continuously integrates power every 5 seconds into cumulative Watt-hours.
3. **NTP Network Time**: Synchronizes local time with `pool.ntp.org` (configured for GMT+5:30).
4. **Hourly Rollup**: Writes accumulated Watt-hours and peak power to `/hourly/YYYY-MM-DD/HH.json` at the start of each hour.
5. **Daily Rollup**: Writes accumulated kilowatt-hours to `/daily/YYYY-MM/DD.json` at midnight and resets the daily accumulator.
6. **Automatic Reconnection**: Re-launches the `Solar_Setup` captive portal automatically if Wi-Fi connectivity drops.

---

## Firebase Realtime Database Structure

```text
firebase-root
  |-- live
  |     |-- solar:    { volts: 18.5, amps: 2.1,  watts: 38.8 }
  |     |-- battery:  { volts: 12.6, amps: 1.8,  watts: 22.7 }
  |     |-- load:     { volts: 12.2, amps: 0.5,  watts: 6.1  }
  |     `-- inverter: { volts: 230,  amps: 0.1,  watts: 23.0 }
  |
  |-- stats
  |     |-- today_kwh: 1.45
  |     |-- week_kwh:  12.30
  |     |-- month_kwh: 54.20
  |     `-- alltime_kwh: 480.50
  |
  |-- hourly
  |     `-- 2026-10-23
  |           |-- 08: { energy_wh: 120.4, peak_w: 180.0 }
  |           `-- 12: { energy_wh: 650.2, peak_w: 820.0 }
  |
  |-- daily
  |     `-- 2026-10
  |           |-- 22: { energy_kwh: 3.80, peak_w: 840.0 }
  |           `-- 23: { energy_kwh: 4.25, peak_w: 865.0 }
  |
  `-- control
        |-- reset_wifi: false
        `-- wifi_config: { ssid: "...", pass: "..." }
```

### Recommended Security Rules
In Firebase Console, navigate to **Realtime Database** > **Rules** and apply:

```json
{
  "rules": {
    ".read": true,
    ".write": false,
    "control": {
      ".write": true
    }
  }
}
```

The ESP32 uses its Database Secret (`?auth=...`) which grants admin write privileges and bypasses rules. The public can read live data while write access is restricted, protecting your database against deletion and tampering.

---

## Battery Chemistry Reference Voltages (12V Baseline)

| State of Charge | Lead-Acid (AGM/Gel) | LiFePO4 (4S) | Li-Ion NMC (3S) | Li-Ion NMC (4S) |
| :---: | :---: | :---: | :---: | :---: |
| **100% (Full Absorption)** | >= 14.40 V | >= 14.40 V | >= 12.60 V | >= 16.80 V |
| **95% (Float)** | 13.80 V | 13.60 V | 12.45 V | 16.60 V |
| **85%** | 13.40 V | 13.40 V | 12.15 V | 16.20 V |
| **75%** | 13.20 V | 13.25 V | 11.85 V | 15.80 V |
| **70%** | 12.80 V | 13.20 V | 11.70 V | 15.60 V |
| **50%** | 12.40 V | 13.10 V | 11.25 V | 15.00 V |
| **35%** | 12.20 V | 13.00 V | 11.00 V | 14.70 V |
| **20%** | 12.00 V | 12.80 V | 10.65 V | 14.20 V |
| **10%** | 11.50 V | 12.00 V | 10.20 V | 13.60 V |
| **0% (Cutoff)** | <= 10.50 V | <= 10.00 V | <= 9.00 V | <= 12.00 V |

Voltages scale automatically when choosing 24V (2x) or 48V (4x) in the Settings tab.

---

## Web Application Setup and Deployment

### 1. Configuration
Open `js/firebase-config.js` and insert your Firebase Web Configuration object:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "solar-telemetry.firebaseapp.com",
  databaseURL: "https://solar-telemetry-default-rtdb.firebaseio.com",
  projectId: "solar-telemetry",
  storageBucket: "solar-telemetry.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 2. Local Development
Run a local static file server:

```bash
# Using Python
python3 -m http.server 8080

# Using Node.js
npx serve .
```

Open `http://localhost:8080` in your web browser.

### 3. Deploying to GitHub Pages
1. Push all files to the `master` or `main` branch of your repository.
2. In GitHub, go to **Settings** > **Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Choose the `master` (or `main`) branch and root directory `/`.
5. Click **Save**. The dashboard will be available at `https://<username>.github.io/<repository>/`.

---

## File Structure

```text
.
|-- index.html              # Main dashboard single page application
|-- manifest.json           # Web App Manifest for PWA installation
|-- sw.js                   # Root service worker for offline asset caching
|-- firebase.json           # Firebase hosting deployment configuration
|-- README.md               # Project documentation
|-- css/
|   `-- style.css           # Glassmorphic dark theme stylesheet
|-- js/
|   |-- app.js              # Application logic, state management, and Firebase handlers
|   |-- charts.js           # Chart.js initialization for Daily, Weekly, Monthly, Yearly
|   `-- firebase-config.js  # Firebase SDK credentials and initialization
|-- icons/
|   |-- icon-192x192.png    # Standard 192x192 PNG application icon
|   |-- icon-512x512.png    # Standard 512x512 PNG application icon
|   |-- icon-maskable-192x192.png # Maskable adaptive icon for Android
|   `-- icon-maskable-512x512.png # Maskable adaptive icon for Android
`-- esp32/
    |-- sketch_oct22a.ino   # Production 4-sensor firmware with energy logging
    `-- solar_monitor.ino   # Legacy single-sensor reference sketch
```
