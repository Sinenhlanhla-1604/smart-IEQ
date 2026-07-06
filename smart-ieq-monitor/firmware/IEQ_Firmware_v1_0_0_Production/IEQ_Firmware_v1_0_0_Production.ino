/*
=========================================================
 Smart Indoor Environmental Quality Monitor
 Production Firmware v1.0.0
=========================================================
*/

#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME680.h>
#include <DHT.h>

// ---------------- USER CONFIG ----------------
const char* DEVICE_ID      = "IEQ_ESP32_001";
const char* WIFI_SSID      = "COOLEST Residence";
const char* WIFI_PASSWORD  = "COOLESTR26";

#define DHTPIN 4
#define DHTTYPE DHT22
#define LDR_PIN 34
#define STATUS_LED 25

#define SDA_PIN 21
#define SCL_PIN 22

#define SEALEVELPRESSURE_HPA (1013.25)

const unsigned long READ_INTERVAL = 5000;

// ---------------- OBJECTS ----------------
Adafruit_BME680 bme(&Wire);   // <-- same as your working test
DHT dht(DHTPIN, DHTTYPE);

// ---------------- STATUS ----------------
bool wifiOK=false;
bool bmeOK=false;
bool dhtOK=false;

unsigned long previousMillis=0;
unsigned long blinkMillis=0;
bool ledState=false;

// ---------------- FUNCTIONS ----------------

void bootAnimation()
{
  for(int i=0;i<6;i++)
  {
    digitalWrite(STATUS_LED,!digitalRead(STATUS_LED));
    delay(200);
  }
}

void connectWiFi()
{
  Serial.print("Connecting WiFi");

  WiFi.begin(WIFI_SSID,WIFI_PASSWORD);

  while(WiFi.status()!=WL_CONNECTED)
  {
    Serial.print(".");
    digitalWrite(STATUS_LED,!digitalRead(STATUS_LED));
    delay(300);
  }

  wifiOK=true;

  Serial.println();
  Serial.println("WiFi Connected");
  Serial.print("IP Address : ");
  Serial.println(WiFi.localIP());
}

bool initialiseBME680()
{
  Serial.println("Initialising BME680...");

  Wire.begin(SDA_PIN,SCL_PIN);
  delay(500);

  if(!bme.begin(0x77))
  {
    Serial.println("ERROR: BME680 not detected.");
    return false;
  }

  bme.setTemperatureOversampling(BME680_OS_8X);
  bme.setHumidityOversampling(BME680_OS_2X);
  bme.setPressureOversampling(BME680_OS_4X);
  bme.setIIRFilterSize(BME680_FILTER_SIZE_3);
  bme.setGasHeater(320,150);

  delay(500);

  if(!bme.performReading())
  {
    Serial.println("ERROR: Initial BME680 reading failed.");
    return false;
  }

  Serial.println("BME680 Ready");
  return true;
}

void updateLED()
{
  bool healthy = wifiOK && bmeOK && dhtOK;

  if(healthy)
  {
    digitalWrite(STATUS_LED,HIGH);
    return;
  }

  if(millis()-blinkMillis>250)
  {
    blinkMillis=millis();
    ledState=!ledState;
    digitalWrite(STATUS_LED,ledState);
  }
}

void setup()
{
  pinMode(STATUS_LED,OUTPUT);
  digitalWrite(STATUS_LED,LOW);

  Serial.begin(115200);
  delay(1000);

  Serial.println("\n======================================");
  Serial.println("Smart IEQ Monitor");
  Serial.println("Firmware v1.0.0");
  Serial.println("======================================");

  bootAnimation();

  bmeOK = initialiseBME680();

  dht.begin();
  delay(2000);

  connectWiFi();
}

void loop()
{
  if(millis()-previousMillis>=READ_INTERVAL)
  {
    previousMillis=millis();

    // -------- BME680 --------
    if(bme.performReading())
    {
      bmeOK=true;
    }
    else
    {
      bmeOK=false;
    }

    // -------- DHT22 --------
    float t=dht.readTemperature();
    float h=dht.readHumidity();

    dhtOK = !(isnan(t)||isnan(h));

    // -------- SERIAL --------
    Serial.println("\n======================================");
    Serial.printf("WiFi   : %s\n",wifiOK?"OK":"ERROR");
    Serial.printf("BME680 : %s\n",bmeOK?"OK":"ERROR");
    Serial.printf("DHT22  : %s\n",dhtOK?"OK":"ERROR");

    if(bmeOK)
    {
      Serial.printf("\nBME Temperature : %.2f C\n",bme.temperature);
      Serial.printf("BME Humidity    : %.2f %%\n",bme.humidity);
      Serial.printf("Pressure        : %.2f hPa\n",bme.pressure/100.0);
      Serial.printf("Gas             : %.2f kOhms\n",bme.gas_resistance/1000.0);
      Serial.printf("Altitude        : %.2f m\n",bme.readAltitude(SEALEVELPRESSURE_HPA));
    }

    if(dhtOK)
    {
      Serial.printf("\nDHT Temperature : %.2f C\n",t);
      Serial.printf("DHT Humidity    : %.2f %%\n",h);
    }

    Serial.printf("\nLight ADC       : %d\n",analogRead(LDR_PIN));
    Serial.printf("RSSI            : %d dBm\n",WiFi.RSSI());
  }

  if(WiFi.status()!=WL_CONNECTED)
  {
    wifiOK=false;
    WiFi.reconnect();
  }
  else
  {
    wifiOK=true;
  }

  updateLED();
}
