#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// LCD Setup
LiquidCrystal_I2C lcd(0x27, 16, 2);

// pH Sensor Two-Point Calibration
// CALIBRATION INSTRUCTIONS:
// 1. Immerse sensor in pH 7.0 buffer solution, wait 30 seconds
// 2. Read voltage from serial monitor, set as ph7_voltage
// 3. Immerse sensor in pH 4.0 buffer solution, wait 30 seconds
// 4. Read voltage from serial monitor, set as ph4_voltage
// 5. Upload this code with your calibration values

// Calibration values (UPDATE THESE AFTER CALIBRATION)
float ph7_voltage = 2.0;  // Voltage at pH 7.0 (neutral)
float ph4_voltage = 2.5;  // Voltage at pH 4.0 (acidic)

// Calculate calibration constants
float ph_slope = 3.0 / (ph7_voltage - ph4_voltage);  // pH difference = 3.0 (7.0 - 4.0)
float ph_offset = 7.0 - (ph_slope * ph7_voltage);

// Alternative: Single-point calibration (if two-point not available)
// float calibration_value = 21.34;  // Old method
// float ph_slope = -5.70;
// float ph_offset = calibration_value;

// Temperature compensation (optional)
const float TEMP_COEFFICIENT = -0.003;  // pH change per °C (typical value)
const float REFERENCE_TEMP = 25.0;      // Reference temperature in °C

unsigned long int avgval;
int buffer_arr[10], temp;

// DS18B20 Temp Sensor Setup
#define ONE_WIRE_BUS 2
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// For tracking last sent data
float last_ph = -1;
float last_temperature = -1000;

void setup() {
  Serial.begin(9600);

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Smart Fish Care");
  lcd.setCursor(0, 1);
  lcd.print("Calibrating...");
  delay(2000);
  lcd.clear();

  sensors.begin();
  
  // Display calibration info on startup
  Serial.println("=== pH Sensor Calibration Info ===");
  Serial.print("pH 7.0 Voltage: ");
  Serial.println(ph7_voltage);
  Serial.print("pH 4.0 Voltage: ");
  Serial.println(ph4_voltage);
  Serial.print("Slope: ");
  Serial.println(ph_slope);
  Serial.print("Offset: ");
  Serial.println(ph_offset);
  Serial.println("================================");
}

void loop() {
  // pH Readings - Take 10 samples for median filtering
  for (int i = 0; i < 10; i++) {
    buffer_arr[i] = analogRead(A0);
    delay(30);
  }

  // Sort readings for median filter
  for (int i = 0; i < 9; i++) {
    for (int j = i + 1; j < 10; j++) {
      if (buffer_arr[i] > buffer_arr[j]) {
        temp = buffer_arr[i];
        buffer_arr[i] = buffer_arr[j];
        buffer_arr[j] = temp;
      }
    }
  }

  // Calculate average of middle 6 values (remove outliers)
  avgval = 0;
  for (int i = 2; i < 8; i++) avgval += buffer_arr[i];

  float avg_analog = avgval / 6.0;
  float voltage = avg_analog * 5.0 / 1024.0;
  
  // Calculate pH using two-point calibration
  float ph_act = ph_slope * voltage + ph_offset;

  // Get temperature
  sensors.requestTemperatures();
  float waterTemp = sensors.getTempCByIndex(0);

  // Temperature compensation (optional - uncomment to enable)
  // float ph_compensated = ph_act + (TEMP_COEFFICIENT * (waterTemp - REFERENCE_TEMP));
  // ph_act = ph_compensated;

  // Validate readings
  bool valid_reading = true;
  if (voltage < 0.5 || voltage > 4.5) {
    valid_reading = false;
  }
  if (ph_act < 0.0 || ph_act > 14.0) {
    valid_reading = false;
  }
  if (waterTemp < -55.0 || waterTemp > 125.0) {
    valid_reading = false;  // DS18B20 range
  }

  // LCD Display
  lcd.clear();
  lcd.setCursor(0, 0);
  String status_str = "";
  
  if (!valid_reading) {
    lcd.print("pH: -- T:");
    lcd.print(waterTemp, 1);
    lcd.setCursor(0, 1);
    lcd.print("Status: Not in H2O");
    status_str = "Not in H2O";
  } else {
    lcd.print("pH:");
    lcd.print(ph_act, 2);  // Show 2 decimal places for better accuracy
    lcd.print(" T:");
    lcd.print(waterTemp, 1);

    lcd.setCursor(0, 1);
    
    // Interpret pH status (matching server.py logic)
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

      // Debug output (comment out in production)
      Serial.print("DEBUG: Voltage=");
      Serial.print(voltage, 3);
      Serial.print("V, pH=");
      Serial.print(ph_act, 2);
      Serial.print(", Temp=");
      Serial.print(waterTemp, 1);
      Serial.println("C");

      last_ph = ph_act;
      last_temperature = waterTemp;
    }
  }

  delay(2000); // Check every 2 seconds
}

