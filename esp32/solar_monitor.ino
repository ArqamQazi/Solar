#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_INA219.h>
#include <time.h>
#include <ArduinoJson.h>

// ---------------- CONFIGURATION ----------------
const char* ssid       = "YOUR_WIFI_SSID";
const char* password   = "YOUR_WIFI_PASSWORD";

// Firebase Configuration
// Database URL (e.g., https://your-project.firebaseio.com)
const char* firebaseHost = "your-project-id-default-rtdb.firebaseio.com";
// Firebase Database Secret or Auth Token (Legacy token or custom token)
const char* firebaseAuth = "YOUR_FIREBASE_DATABASE_SECRET"; 

// NTP Server Settings
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 0; // Adjust for your timezone (e.g., 3600 for GMT+1)
const int   daylightOffset_sec = 3600;

// Update Intervals
const unsigned long UPDATE_INTERVAL_LIVE = 5000;    // 5 seconds
const unsigned long UPDATE_INTERVAL_HOURLY = 3600000; // 1 hour

// ---------------- GLOBALS ----------------
Adafruit_INA219 ina219;
unsigned long lastLiveUpdate = 0;
unsigned long lastHourlyUpdate = 0;

float currentEnergyWh = 0;
float currentPeakW = 0;
float dailyTotalWh = 0;  // Running total for today
int currentHour = -1;

const int LED_PIN = 2; // Built-in LED on most ESP32 boards

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Initialize INA219
  if (!ina219.begin()) {
    Serial.println("Failed to find INA219 chip");
    while (1) { delay(10); }
  }
  Serial.println("INA219 initialized");
  
  // Set calibration (Optional: use ina219.setCalibration_32V_1A() for higher precision at lower currents)
  // ina219.setCalibration_32V_2A();

  // Connect to WiFi
  connectWiFi();

  // Initialize NTP Time
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  printLocalTime();
}

void loop() {
  // Reconnect WiFi if lost
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  unsigned long currentMillis = millis();

  // 1. Live Data Update (Every 5 seconds)
  if (currentMillis - lastLiveUpdate >= UPDATE_INTERVAL_LIVE) {
    lastLiveUpdate = currentMillis;
    
    // Read sensor
    float shuntvoltage = ina219.getShuntVoltage_mV();
    float busvoltage = ina219.getBusVoltage_V();
    float current_mA = ina219.getCurrent_mA();
    float power_mW = ina219.getPower_mW();
    
    // Calculate final values
    float loadvoltage = busvoltage + (shuntvoltage / 1000);
    float current_A = current_mA / 1000.0;
    float power_W = power_mW / 1000.0;
    
    // Clamp negative values (sensor noise when no current)
    if (current_A < 0) current_A = 0;
    if (power_W < 0) power_W = 0;

    Serial.printf("Live: %.2f V | %.2f A | %.2f W\n", loadvoltage, current_A, power_W);
    
    // Track peak power
    if (power_W > currentPeakW) {
      currentPeakW = power_W;
    }
    
    // Integrate energy (W * hours = Wh)
    // 5 seconds = 5/3600 hours
    float energyIncrement = power_W * (UPDATE_INTERVAL_LIVE / 3600000.0);
    currentEnergyWh += energyIncrement;
    dailyTotalWh += energyIncrement;

    // Send to Firebase
    sendLiveData(loadvoltage, current_A, power_W);
    
    // Update today's running energy total in stats
    updateTodayEnergy();
    
    // Check if hour changed to save hourly data
    struct tm timeinfo;
    if (getLocalTime(&timeinfo)) {
      if (currentHour == -1) {
        currentHour = timeinfo.tm_hour; // Initialize
      } else if (currentHour != timeinfo.tm_hour) {
        // Hour has changed! Save hourly data
        saveHourlyData(timeinfo);
        
        // Check if day changed
        if (timeinfo.tm_hour == 0) {
           saveDailyData(timeinfo);
           dailyTotalWh = 0;  // Reset daily accumulator
        }
        
        // Reset accumulators
        currentHour = timeinfo.tm_hour;
        currentEnergyWh = 0;
        currentPeakW = 0;
      }
    }
  }
}

void connectWiFi() {
  Serial.print("Connecting to WiFi ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Toggle LED
  }
  
  digitalWrite(LED_PIN, HIGH); // LED solid on when connected
  Serial.println("\nWiFi connected.");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void printLocalTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("Failed to obtain time");
    return;
  }
  Serial.println(&timeinfo, "%A, %B %d %Y %H:%M:%S");
}

String getTimestamp() {
  time_t now;
  time(&now);
  return String(now);
}

void sendLiveData(float v, float i, float p) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String("https://") + firebaseHost + "/live.json?auth=" + firebaseAuth;
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  // Build JSON payload
  StaticJsonDocument<200> doc;
  doc["voltage"] = v;
  doc["current"] = i;
  doc["power"] = p;
  doc["timestamp"] = time(nullptr);
  
  String payload;
  serializeJson(doc, payload);
  
  // Use PUT to overwrite the 'live' node completely
  int httpResponseCode = http.PUT(payload);
  
  if (httpResponseCode > 0) {
    // Serial.printf("Live update HTTP Response: %d\n", httpResponseCode);
  } else {
    Serial.printf("Live update HTTP Error: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  
  http.end();
}

void saveHourlyData(struct tm timeinfo) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  // Calculate yesterday's date if hour just rolled over to 0 (midnight)
  // because the energy accumulated belongs to hour 23 of the previous day
  struct tm recordTime = timeinfo;
  if (timeinfo.tm_hour == 0) {
    time_t now;
    time(&now);
    now -= 3600; // Go back 1 hour
    localtime_r(&now, &recordTime);
  }
  
  char dateStr[11];
  strftime(dateStr, sizeof(dateStr), "%Y-%m-%d", &recordTime);
  
  int recordHour = recordTime.tm_hour;

  Serial.printf("Saving hourly data for %s hour %d: %.2f Wh, Peak %.2f W\n", dateStr, recordHour, currentEnergyWh, currentPeakW);

  HTTPClient http;
  String url = String("https://") + firebaseHost + "/hourly/" + dateStr + "/" + String(recordHour) + ".json?auth=" + firebaseAuth;
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<200> doc;
  doc["energy_wh"] = currentEnergyWh;
  doc["peak_w"] = currentPeakW;
  
  String payload;
  serializeJson(doc, payload);
  
  int httpResponseCode = http.PUT(payload);
  if (httpResponseCode <= 0) {
    Serial.printf("Hourly update HTTP Error: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  http.end();
}

void updateTodayEnergy() {
  // Update today's running energy in stats (PATCH only today_kwh)
  if (WiFi.status() != WL_CONNECTED) return;
  
  // Only update every 30 seconds to reduce Firebase writes (6x per cycle)
  static unsigned long lastStatsUpdate = 0;
  if (millis() - lastStatsUpdate < 30000) return;
  lastStatsUpdate = millis();
  
  HTTPClient http;
  String url = String("https://") + firebaseHost + "/stats/today_kwh.json?auth=" + firebaseAuth;
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  float todayKwh = dailyTotalWh / 1000.0;
  String payload = String(todayKwh, 3);
  
  http.PUT(payload);
  http.end();
}

void saveDailyData(struct tm timeinfo) {
  // Aggregate the previous day's hourly data into a daily total.
  // At midnight, we read all hourly entries for yesterday and sum them.
  
  if (WiFi.status() != WL_CONNECTED) return;

  // Get yesterday's date
  time_t now;
  time(&now);
  now -= 86400; // Go back 24 hours
  struct tm yesterday;
  localtime_r(&now, &yesterday);
  
  char dateStr[11];   // YYYY-MM-DD
  strftime(dateStr, sizeof(dateStr), "%Y-%m-%d", &yesterday);
  
  char monthStr[8];   // YYYY-MM
  strftime(monthStr, sizeof(monthStr), "%Y-%m", &yesterday);
  
  char dayStr[3];     // DD
  strftime(dayStr, sizeof(dayStr), "%d", &yesterday);

  Serial.printf("Aggregating daily data for %s\n", dateStr);

  // GET all hourly data for yesterday from Firebase
  HTTPClient http;
  String url = String("https://") + firebaseHost + "/hourly/" + dateStr + ".json?auth=" + firebaseAuth;
  
  http.begin(url);
  int httpResponseCode = http.GET();
  
  float totalEnergyWh = 0;
  float peakW = 0;
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    
    DynamicJsonDocument doc(4096);
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error && !doc.isNull()) {
      JsonObject root = doc.as<JsonObject>();
      for (JsonPair kv : root) {
        JsonObject hourData = kv.value().as<JsonObject>();
        totalEnergyWh += hourData["energy_wh"].as<float>();
        float hourPeak = hourData["peak_w"].as<float>();
        if (hourPeak > peakW) peakW = hourPeak;
      }
    }
  } else {
    Serial.printf("GET hourly data failed: %d\n", httpResponseCode);
  }
  http.end();

  float totalEnergyKwh = totalEnergyWh / 1000.0;
  Serial.printf("Daily total for %s: %.2f kWh, Peak: %.0f W\n", dateStr, totalEnergyKwh, peakW);

  // Write daily data to Firebase
  HTTPClient http2;
  String dailyUrl = String("https://") + firebaseHost + "/daily/" + monthStr + "/" + dayStr + ".json?auth=" + firebaseAuth;
  
  http2.begin(dailyUrl);
  http2.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<200> dailyDoc;
  dailyDoc["energy_kwh"] = totalEnergyKwh;
  dailyDoc["peak_w"] = peakW;
  
  String payload;
  serializeJson(dailyDoc, payload);
  
  int putResponse = http2.PUT(payload);
  if (putResponse <= 0) {
    Serial.printf("Daily update HTTP Error: %s\n", http2.errorToString(putResponse).c_str());
  }
  http2.end();

  // Update stats - reset today_kwh to 0 for the new day
  updateStats(totalEnergyKwh);
}

void updateStats(float yesterdayKwh) {
  if (WiFi.status() != WL_CONNECTED) return;

  // First GET current stats
  HTTPClient http;
  String url = String("https://") + firebaseHost + "/stats.json?auth=" + firebaseAuth;
  
  http.begin(url);
  int httpResponseCode = http.GET();
  
  float alltime = 0;
  float month = 0;
  float week = 0;

  if (httpResponseCode == 200) {
    String response = http.getString();
    StaticJsonDocument<256> doc;
    deserializeJson(doc, response);
    
    alltime = doc["alltime_kwh"].as<float>();
    month = doc["month_kwh"].as<float>();
    week = doc["week_kwh"].as<float>();
  }
  http.end();

  // Update totals
  alltime += yesterdayKwh;
  month += yesterdayKwh;
  week += yesterdayKwh;

  // Write updated stats
  HTTPClient http2;
  http2.begin(url);
  http2.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<256> statsDoc;
  statsDoc["today_kwh"] = 0;           // Reset for new day
  statsDoc["week_kwh"] = week;
  statsDoc["month_kwh"] = month;
  statsDoc["alltime_kwh"] = alltime;
  
  String payload;
  serializeJson(statsDoc, payload);
  http2.PUT(payload);
  http2.end();
  
  Serial.println("Stats updated successfully");
}

