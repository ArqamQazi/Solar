#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <WiFiManager.h>
#include <time.h>
#include <Preferences.h>

String firebaseUrl = "https://solar-telemetry-default-rtdb.firebaseio.com";
String firebaseAuth = "YNOXhRwaK4JqeLE6YA1uOjSpwPYUxCb1DnNPmQBY";

const int numSensors = 4;
int addresses[numSensors] = {0x40, 0x41, 0x44, 0x45};
String sensorNames[numSensors] = {"solar", "battery", "load", "inverter"};
float voltageOffsets[numSensors] = {0.00, 0.10, -0.55, -0.54};
float shuntResistance = 0.0015;

const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 19800; // GMT+5:30 (19800 seconds)
const int daylightOffset_sec = 0;

Preferences prefs;

float currentHourWh = 0.0;
float currentHourPeakW = 0.0;
float currentDayWh = 0.0;
int lastHour = -1;
int currentDayOfMonth = -1;

unsigned long lastResetCheck = 0;
unsigned long lastStatsUpdate = 0;
unsigned long lastScanUpload = 0;

int16_t readRegister(int address, byte reg) {
  Wire.beginTransmission(address);
  Wire.write(reg);
  Wire.endTransmission();
  Wire.requestFrom(address, 2);
  if (Wire.available() >= 2) {
    return (Wire.read() << 8) | Wire.read();
  }
  return 0;
}

void httpPut(String path, String payload) {
  HTTPClient http;
  String url = firebaseUrl + path + "?auth=" + firebaseAuth;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.PUT(payload);
  http.end();
}

void saveEnergyToNvs() {
  prefs.begin("solar_data", false);
  prefs.putFloat("day_wh", currentDayWh);
  prefs.putFloat("hour_wh", currentHourWh);
  prefs.putFloat("peak_w", currentHourPeakW);
  if (currentDayOfMonth > 0) {
    prefs.putInt("day", currentDayOfMonth);
  }
  prefs.end();
}

void loadEnergyFromNvs() {
  prefs.begin("solar_data", false);
  float savedDayWh = prefs.getFloat("day_wh", 0.0);
  float savedHourWh = prefs.getFloat("hour_wh", 0.0);
  float savedPeakW = prefs.getFloat("peak_w", 0.0);
  int savedDay = prefs.getInt("day", -1);
  prefs.end();

  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    currentDayOfMonth = timeinfo.tm_mday;
    if (savedDay == timeinfo.tm_mday) {
      currentDayWh = savedDayWh;
      currentHourWh = savedHourWh;
      currentHourPeakW = savedPeakW;
      Serial.printf("Restored energy from NVS: %.2f Wh for day %d\n", currentDayWh, currentDayOfMonth);
    } else {
      currentDayWh = 0.0;
      currentHourWh = 0.0;
      currentHourPeakW = 0.0;
      saveEnergyToNvs();
    }
  } else {
    currentDayWh = savedDayWh;
    currentHourWh = savedHourWh;
    currentHourPeakW = savedPeakW;
  }
}

void syncTodayKwhFromFirebase() {
  HTTPClient http;
  String url = firebaseUrl + "/stats/today_kwh.json?auth=" + firebaseAuth;
  http.begin(url);
  int httpCode = http.GET();
  if (httpCode == 200) {
    String payload = http.getString();
    payload.trim();
    float cloudKwh = payload.toFloat();
    float cloudWh = cloudKwh * 1000.0;
    if (cloudWh > currentDayWh) {
      currentDayWh = cloudWh;
      Serial.printf("Synced higher energy total from Firebase: %.2f Wh\n", currentDayWh);
      saveEnergyToNvs();
    }
  }
  http.end();
}

void scanAndUploadNetworks() {
  Serial.println("Scanning nearby 2.4GHz Wi-Fi networks...");
  int n = WiFi.scanNetworks();
  if (n < 0) return;

  String json = "[";
  int count = 0;
  for (int i = 0; i < n; i++) {
    String ssid = WiFi.SSID(i);
    ssid.trim();
    if (ssid.length() == 0) continue;

    bool duplicate = false;
    for (int j = 0; j < i; j++) {
      if (WiFi.SSID(j) == ssid) {
        duplicate = true;
        break;
      }
    }
    if (duplicate) continue;

    if (count > 0) json += ",";
    json += "{\"ssid\":\"" + ssid + "\",\"rssi\":" + String(WiFi.RSSI(i)) + "}";
    count++;
  }
  json += "]";
  WiFi.scanDelete();

  httpPut("/control/available_networks.json", json);
  Serial.println("Uploaded " + String(count) + " networks to Firebase.");
}

bool checkRemoteReset() {
  HTTPClient http;
  String url = firebaseUrl + "/control/reset_wifi.json?auth=" + firebaseAuth;
  http.begin(url);
  int httpCode = http.GET();
  bool shouldReset = false;
  if (httpCode == 200) {
    String payload = http.getString();
    if (payload.indexOf("true") >= 0) {
      shouldReset = true;
    }
  }
  http.end();
  return shouldReset;
}

void checkRemoteWifiCommands() {
  HTTPClient http;
  String url = firebaseUrl + "/control/scan_wifi.json?auth=" + firebaseAuth;
  http.begin(url);
  int httpCode = http.GET();
  if (httpCode == 200) {
    String payload = http.getString();
    if (payload.indexOf("true") >= 0) {
      httpPut("/control/scan_wifi.json", "false");
      scanAndUploadNetworks();
    }
  }
  http.end();

  String configUrl = firebaseUrl + "/control/wifi_config.json?auth=" + firebaseAuth;
  http.begin(configUrl);
  httpCode = http.GET();
  if (httpCode == 200) {
    String payload = http.getString();
    if (payload.indexOf("\"apply\":true") >= 0 || payload.indexOf("\"apply\": true") >= 0) {
      int ssidStart = payload.indexOf("\"ssid\":\"") + 8;
      int ssidEnd = payload.indexOf("\"", ssidStart);
      int passStart = payload.indexOf("\"pass\":\"") + 8;
      int passEnd = payload.indexOf("\"", passStart);

      if (ssidStart > 8 && ssidEnd > ssidStart) {
        String newSsid = payload.substring(ssidStart, ssidEnd);
        String newPass = "";
        if (passStart > 8 && passEnd > passStart) {
          newPass = payload.substring(passStart, passEnd);
        }

        Serial.println("Switching to new network: " + newSsid);
        httpPut("/control/wifi_config/apply.json", "false");
        saveEnergyToNvs();

        WiFi.disconnect();
        WiFi.begin(newSsid.c_str(), newPass.c_str());

        unsigned long startWait = millis();
        bool ok = false;
        while (millis() - startWait < 15000) {
          if (WiFi.status() == WL_CONNECTED) {
            ok = true;
            break;
          }
          delay(500);
        }

        if (ok) {
          Serial.println("Connected to new Wi-Fi: " + newSsid);
        } else {
          Serial.println("Failed to connect. Launching Solar_Setup portal...");
          WiFiManager wm;
          wm.setConfigPortalTimeout(180);
          wm.autoConnect("Solar_Setup");
        }
      }
    }
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);

  Serial.println("\nStarting WiFiManager...");

  WiFiManager wm;
  wm.setConfigPortalTimeout(180);
  bool res = wm.autoConnect("Solar_Setup");

  if (!res) {
    Serial.println("Failed to connect or hit timeout. Rebooting...");
    delay(3000);
    ESP.restart();
  }

  Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  delay(1000);
  loadEnergyFromNvs();
  syncTodayKwhFromFirebase();
  scanAndUploadNetworks();
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    String jsonPayload = "{";
    float solarWatts = 0.0;

    for (int i = 0; i < numSensors; i++) {
      int16_t rawVolts = readRegister(addresses[i], 0x02);
      float volts = (rawVolts * 0.00125) + voltageOffsets[i];
      if (volts < 0) volts = 0.00;

      int16_t rawShunt = readRegister(addresses[i], 0x01);
      float shuntVolts = rawShunt * 0.0000025;
      float amps = shuntVolts / shuntResistance;
      if (abs(amps) < 0.05) amps = 0.00;

      float watts = volts * abs(amps);
      if (sensorNames[i] == "solar") solarWatts = watts;

      Serial.printf("[%s 0x%02X] rawShunt: %d, Volts: %.2fV, Amps: %.2fA, Watts: %.2fW\n", 
                    sensorNames[i].c_str(), addresses[i], rawShunt, volts, amps, watts);

      jsonPayload += "\"" + sensorNames[i] + "\": {";
      jsonPayload += "\"volts\":" + String(volts, 2) + ",";
      jsonPayload += "\"amps\":" + String(amps, 2) + ",";
      jsonPayload += "\"watts\":" + String(watts, 2);
      jsonPayload += "}";

      if (i < numSensors - 1) jsonPayload += ",";
    }
    jsonPayload += "}";

    // 1. Send live telemetry
    httpPut("/live.json", jsonPayload);
    Serial.println("Sent live: " + jsonPayload);

    // 2. Numerical integration for energy (5 seconds = 5 / 3600 hours)
    float deltaWh = solarWatts * (5.0 / 3600.0);
    currentHourWh += deltaWh;
    currentDayWh += deltaWh;
    if (solarWatts > currentHourPeakW) currentHourPeakW = solarWatts;

    // 3. Update running daily total in stats every 30 seconds and save to NVS flash
    unsigned long currentMillis = millis();
    if (currentMillis - lastStatsUpdate >= 30000) {
      lastStatsUpdate = currentMillis;
      float todayKwh = currentDayWh / 1000.0;
      httpPut("/stats/today_kwh.json", String(todayKwh, 3));
      saveEnergyToNvs();
    }

    // 4. Check for remote reset and remote Wi-Fi commands every 10 seconds
    if (currentMillis - lastResetCheck >= 10000) {
      lastResetCheck = currentMillis;
      if (checkRemoteReset()) {
        Serial.println("PWA requested Wi-Fi reset. Preserving energy and opening portal...");
        saveEnergyToNvs();
        httpPut("/control/reset_wifi.json", "false");
        WiFiManager wm;
        wm.resetSettings();
        delay(1000);
        ESP.restart();
      }
      checkRemoteWifiCommands();
    }

    // 5. Periodic Wi-Fi network scan every 10 minutes
    if (currentMillis - lastScanUpload >= 600000) {
      lastScanUpload = currentMillis;
      scanAndUploadNetworks();
    }

    // 6. Hourly and Daily rollups using NTP time
    struct tm timeinfo;
    if (getLocalTime(&timeinfo)) {
      currentDayOfMonth = timeinfo.tm_mday;
      if (lastHour == -1) {
        lastHour = timeinfo.tm_hour;
      } else if (lastHour != timeinfo.tm_hour) {
        char dateStr[11];
        strftime(dateStr, sizeof(dateStr), "%Y-%m-%d", &timeinfo);
        String hourPath = "/hourly/" + String(dateStr) + "/" + String(lastHour) + ".json";
        String hourPayload = "{\"energy_wh\":" + String(currentHourWh, 2) + ",\"peak_w\":" + String(currentHourPeakW, 1) + "}";
        httpPut(hourPath, hourPayload);
        Serial.println("Saved hourly rollup: " + hourPayload);

        if (timeinfo.tm_hour == 0) {
          char monthStr[8];
          char dayStr[3];
          strftime(monthStr, sizeof(monthStr), "%Y-%m", &timeinfo);
          strftime(dayStr, sizeof(dayStr), "%d", &timeinfo);

          float dailyKwh = currentDayWh / 1000.0;
          String dayPath = "/daily/" + String(monthStr) + "/" + String(dayStr) + ".json";
          String dayPayload = "{\"energy_kwh\":" + String(dailyKwh, 2) + ",\"peak_w\":" + String(currentHourPeakW, 1) + "}";
          httpPut(dayPath, dayPayload);
          Serial.println("Saved daily rollup: " + dayPayload);

          currentDayWh = 0.0;
        }

        currentHourWh = 0.0;
        currentHourPeakW = 0.0;
        lastHour = timeinfo.tm_hour;
        saveEnergyToNvs();
      }
    }
  } else {
    // When moved to a new place while running on battery, launch setup portal automatically
    Serial.println("WiFi lost. Opening Solar_Setup portal...");
    WiFiManager wm;
    wm.setConfigPortalTimeout(180);
    if (!wm.autoConnect("Solar_Setup")) {
      ESP.restart();
    }
  }

  delay(5000);
}
