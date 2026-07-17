/*
=========================================================
 Smart Indoor Environmental Quality Monitor
 Production Firmware v1.1.0
 ---------------------------------------------------------
 Merged version:
   - Health monitoring, status LED, boot animation, RSSI
     logging, and WiFi reconnect logic (from v1.0.0)
   - JSON payload construction + HTTP POST to Flask API
   - LDR -> approximate lux conversion (clamped 0-100,000)
=========================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME680.h>
#include <DHT.h>

// ---------------- USER CONFIG ----------------
const char* DEVICE_ID1      = "IEQ_ESP32_001";
const char* WIFI_SSID1      = "COOLEST Residence";
const char* WIFI_PASSWORD1  = "COOLESTR26";

const char* DEVICE_ID      = "IEQ_ESP32_001";
const char* WIFI_SSID      = "Openserve-t3GZ";
const char* WIFI_PASSWORD  = "F3JCdR87";



// Flask API endpoint - update the IP once the API is running on your network
const char* API_ENDPOINT   = "http://192.168.100.74:5000/api/readings";

#define DHTPIN 4
#define DHTTYPE DHT22
#define LDR_PIN 34
#define STATUS_LED 25

#define SDA_PIN 21
#define SCL_PIN 22

#define SEALEVELPRESSURE_HPA (1013.25)

const unsigned long READ_INTERVAL = 5000; // 5 seconds

// ---------------- LDR -> LUX CALIBRATION ----------------
// Voltage divider: 3.3V -> LDR -> ADC_PIN -> Fixed resistor -> GND
// Adjust FIXED_RESISTOR_OHMS to match your actual divider resistor.
const float FIXED_RESISTOR_OHMS = 10000.0;
const float ADC_MAX             = 4095.0;
const float SUPPLY_VOLTAGE      = 3.3;

// Generic photoresistor characteristic curve approximation.
// Refine LUX_CAL_A / LUX_CAL_GAMMA against a real lux meter for accuracy.
const float LUX_CAL_A     = 500000.0;
const float LUX_CAL_GAMMA = 1.4;
const float LUX_CLAMP_MAX = 100000.0; // stopgap until calibrated

// ---------------- OBJECTS ----------------
Adafruit_BME680 bme(&Wire);
DHT dht(DHTPIN, DHTTYPE);

// ---------------- STATUS ----------------
bool wifiOK = false;
bool bmeOK  = false;
bool dhtOK  = false;

unsigned long previousMillis = 0;
unsigned long blinkMillis    = 0;
bool ledState = false;

// Last-known-good readings, sent even if one sensor fails (null-safe on API side)
float lastDhtTemp = NAN;
float lastDhtHumidity = NAN;

// ---------------- FUNCTIONS ----------------

void bootAnimation()
{
  for (int i = 0; i < 6; i++)
  {
    digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
    delay(200);
  }
}

void connectWiFi()
{
  Serial.print("Connecting WiFi");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 20000)
  {
    Serial.print(".");
    digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
    delay(300);
  }

  wifiOK = (WiFi.status() == WL_CONNECTED);

  Serial.println();
  if (wifiOK)
  {
    Serial.println("WiFi Connected");
    Serial.print("IP Address : ");
    Serial.println(WiFi.localIP());
  }
  else
  {
    Serial.println("WiFi connection failed - will keep retrying in loop().");
  }
}

bool initialiseBME680()
{
  Serial.println("Initialising BME680...");

  Wire.begin(SDA_PIN, SCL_PIN);
  delay(500);

  if (!bme.begin(0x77))
  {
    Serial.println("ERROR: BME680 not detected.");
    return false;
  }

  bme.setTemperatureOversampling(BME680_OS_8X);
  bme.setHumidityOversampling(BME680_OS_2X);
  bme.setPressureOversampling(BME680_OS_4X);
  bme.setIIRFilterSize(BME680_FILTER_SIZE_3);
  bme.setGasHeater(320, 150);

  delay(500);

  if (!bme.performReading())
  {
    Serial.println("ERROR: Initial BME680 reading failed.");
    return false;
  }

  Serial.println("BME680 Ready");
  return true;
}

// Reads the LDR and converts the analog value into an approximate lux figure.
float readLux()
{
  int adcValue = analogRead(LDR_PIN);

  if (adcValue <= 0) adcValue = 1;
  if (adcValue >= (int)ADC_MAX) adcValue = ADC_MAX - 1;

  float voltage = (adcValue / ADC_MAX) * SUPPLY_VOLTAGE;
  float rLdrOhms = FIXED_RESISTOR_OHMS * (SUPPLY_VOLTAGE - voltage) / voltage;
  float rLdrKOhms = rLdrOhms / 1000.0;

  float lux = LUX_CAL_A * pow(rLdrKOhms, -LUX_CAL_GAMMA);

  // Clamp to a physically sane range as a calibration stopgap.
  if (lux < 0) lux = 0;
  if (lux > LUX_CLAMP_MAX) lux = LUX_CLAMP_MAX;

  return lux;
}

void updateLED()
{
  bool healthy = wifiOK && bmeOK && dhtOK;

  if (healthy)
  {
    digitalWrite(STATUS_LED, HIGH);
    return;
  }

  if (millis() - blinkMillis > 250)
  {
    blinkMillis = millis();
    ledState = !ledState;
    digitalWrite(STATUS_LED, ledState);
  }
}

// Builds the JSON payload and POSTs it to the Flask API.
bool postReading(float lux)
{
  if (!wifiOK)
  {
    Serial.println("Skipping POST - WiFi not connected.");
    return false;
  }

  StaticJsonDocument<512> doc;
  doc["device_id"] = DEVICE_ID;

  if (bmeOK)
  {
    doc["temp_bme"]     = bme.temperature;
    doc["humidity_bme"] = bme.humidity;
    doc["pressure_hpa"] = bme.pressure / 100.0;
    doc["gas_kohm"]     = bme.gas_resistance / 1000.0;
  }
  else
  {
    doc["temp_bme"]     = nullptr;
    doc["humidity_bme"] = nullptr;
    doc["pressure_hpa"] = nullptr;
    doc["gas_kohm"]     = nullptr;
  }

  if (dhtOK)
  {
    doc["temp_dht"]     = lastDhtTemp;
    doc["humidity_dht"] = lastDhtHumidity;
  }
  else
  {
    doc["temp_dht"]     = nullptr;
    doc["humidity_dht"] = nullptr;
  }

  doc["light_lux"] = lux;
  doc["rssi_dbm"]  = WiFi.RSSI();
  doc["uptime_ms"] = millis();

  String payload;
  serializeJson(doc, payload);

  HTTPClient http;
  http.begin(API_ENDPOINT);
  http.addHeader("Content-Type", "application/json");

  int httpResponseCode = http.POST(payload);

  if (httpResponseCode > 0)
  {
    Serial.printf("POST sent. Response code: %d\n", httpResponseCode);
    Serial.println(http.getString());
  }
  else
  {
    Serial.printf("POST failed. Error: %s\n", http.errorToString(httpResponseCode).c_str());
  }

  http.end();
  return httpResponseCode > 0;
}

void setup()
{
  pinMode(STATUS_LED, OUTPUT);
  digitalWrite(STATUS_LED, LOW);

  Serial.begin(115200);
  delay(1000);

  Serial.println("\n======================================");
  Serial.println("Smart IEQ Monitor");
  Serial.println("Firmware v1.1.0");
  Serial.println("======================================");

  bootAnimation();

  bmeOK = initialiseBME680();

  dht.begin();
  delay(2000);

  connectWiFi();
}

void loop()
{
  if (millis() - previousMillis >= READ_INTERVAL)
  {
    previousMillis = millis();

    // -------- BME680 --------
    bmeOK = bme.performReading();

    // -------- DHT22 --------
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    dhtOK = !(isnan(t) || isnan(h));
    if (dhtOK)
    {
      lastDhtTemp = t;
      lastDhtHumidity = h;
    }

    // -------- LDR --------
    float lux = readLux();

    // -------- SERIAL DIAGNOSTICS --------
    Serial.println("\n======================================");
    Serial.printf("WiFi   : %s\n", wifiOK ? "OK" : "ERROR");
    Serial.printf("BME680 : %s\n", bmeOK ? "OK" : "ERROR");
    Serial.printf("DHT22  : %s\n", dhtOK ? "OK" : "ERROR");

    if (bmeOK)
    {
      Serial.printf("\nBME Temperature : %.2f C\n", bme.temperature);
      Serial.printf("BME Humidity    : %.2f %%\n", bme.humidity);
      Serial.printf("Pressure        : %.2f hPa\n", bme.pressure / 100.0);
      Serial.printf("Gas             : %.2f kOhms\n", bme.gas_resistance / 1000.0);
      Serial.printf("Altitude        : %.2f m\n", bme.readAltitude(SEALEVELPRESSURE_HPA));
    }

    if (dhtOK)
    {
      Serial.printf("\nDHT Temperature : %.2f C\n", lastDhtTemp);
      Serial.printf("DHT Humidity    : %.2f %%\n", lastDhtHumidity);
    }

    Serial.printf("\nLight ADC       : %d\n", analogRead(LDR_PIN));
    Serial.printf("Light Lux (est) : %.1f\n", lux);
    Serial.printf("RSSI            : %d dBm\n", WiFi.RSSI());

    // -------- SEND TO BACKEND --------
    postReading(lux);
  }

  if (WiFi.status() != WL_CONNECTED)
  {
    wifiOK = false;
    WiFi.reconnect();
  }
  else
  {
    wifiOK = true;
  }

  updateLED();
}
