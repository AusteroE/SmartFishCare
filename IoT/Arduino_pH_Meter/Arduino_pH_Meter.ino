#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// LCD Setup
LiquidCrystal_I2C lcd(0x27, 16, 2);

// pH Sensor Calibration 
float calibration_value = 21.34;
unsigned long int avgval;
int buffer_arr[10], temp;

// DS18B20 Temp Sensor Setup
#define ONE_WIRE_BUS 2
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// For tracking last sent data
float last_ph = -1;
float last_temperature = -1000; // impossible temp so first send happens

void setup() {
  Serial.begin(9600);

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Smart Fish Care");
  lcd.setCursor(0, 1);
  lcd.print("Monitoring...");
  delay(2000);
  lcd.clear();

  sensors.begin();
}

void loop() {
  // pH Readings
  for (int i = 0; i < 10; i++) {
    buffer_arr[i] = analogRead(A0);
    delay(30);
  }

  // Sort readings
  for (int i = 0; i < 9; i++) {
    for (int j = i + 1; j < 10; j++) {
      if (buffer_arr[i] > buffer_arr[j]) {
        temp = buffer_arr[i];
        buffer_arr[i] = buffer_arr[j];
        buffer_arr[j] = temp;
      }
    }
  }

  avgval = 0;
  for (int i = 2; i < 8; i++) avgval += buffer_arr[i];

  float avg_analog = avgval / 6.0;
  float voltage = avg_analog * 5.0 / 1024.0;
  float ph_act = -5.70 * voltage + calibration_value;

  sensors.requestTemperatures();
  float waterTemp = sensors.getTempCByIndex(0);

  // LCD Display
  lcd.clear();
  lcd.setCursor(0, 0);
  String status_str = "";
  
  if (voltage < 0.5 || voltage > 4.5 || ph_act < 0.0 || ph_act > 14.0) {
    lcd.print("pH: -- T:");
    lcd.print(waterTemp, 1);
    lcd.setCursor(0, 1);
    lcd.print("Status: Not in H2O");
    status_str = "Not in H2O";
  } else {
    lcd.print("pH:");
    lcd.print(ph_act, 1);
    lcd.print(" Temp:");
    lcd.print(waterTemp, 1);

    lcd.setCursor(0, 1);
    if (ph_act >= 6.5 && ph_act <= 8.0) {
      lcd.print("Stat: SAFE");
      status_str = "SAFE";
    } else if (ph_act >= 4.1 && ph_act < 6.5) {
      lcd.print("Stat: ACIDIC");
      status_str = "ACIDIC";
    } else if (ph_act > 8.0 && ph_act <= 9.5) {
      lcd.print("Stat: ALKALINE");
      status_str = "ALKALINE";
    } else if (ph_act <= 4.0) {
      lcd.print("Stat: DNG ACIDIC");
      status_str = "DNG ACIDIC";
    } else if (ph_act > 9.5) {
      lcd.print("Stat: DNG ALKALINE");
      status_str = "DNG ALKALINE";
    } else {
      lcd.print("Stat: UNKNOWN");
      status_str = "UNKNOWN";
    }

    // Send to Serial ONLY if changed significantly
    if (abs(ph_act - last_ph) >= 0.05 || abs(waterTemp - last_temperature) >= 0.1) {
      Serial.print("ph_value=");
      Serial.print(ph_act, 2);
      Serial.print("&temperature=");
      Serial.print(waterTemp, 2);
      Serial.print("&status=");
      Serial.println(status_str);

      last_ph = ph_act;
      last_temperature = waterTemp;
    }
  }

  delay(2000); // Check every 2 seconds
}