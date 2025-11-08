/*
 * pH Sensor Calibration Helper
 * 
 * This sketch helps you calibrate your pH sensor by displaying
 * the raw voltage readings for known pH buffer solutions.
 * 
 * INSTRUCTIONS:
 * 1. Upload this sketch to your Arduino
 * 2. Open Serial Monitor (9600 baud)
 * 3. Immerse sensor in pH 7.0 buffer solution
 * 4. Wait 30 seconds for stabilization
 * 5. Note the "Average Voltage" value - this is ph7_voltage
 * 6. Rinse sensor with distilled water
 * 7. Immerse sensor in pH 4.0 buffer solution
 * 8. Wait 30 seconds for stabilization
 * 9. Note the "Average Voltage" value - this is ph4_voltage
 * 10. Use these values in Arduino_pH_Meter_Improved.ino
 */

unsigned long int avgval;
int buffer_arr[10], temp;

void setup() {
  Serial.begin(9600);
  Serial.println("=== pH Sensor Calibration Helper ===");
  Serial.println("Ready to calibrate...");
  Serial.println("Immerse sensor in buffer solution and wait 30 seconds");
  Serial.println("====================================");
  delay(2000);
}

void loop() {
  // Take 10 readings
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

  // Calculate average of middle 6 values (remove outliers)
  avgval = 0;
  for (int i = 2; i < 8; i++) {
    avgval += buffer_arr[i];
  }

  float avg_analog = avgval / 6.0;
  float voltage = avg_analog * 5.0 / 1024.0;
  
  // Display raw values
  Serial.print("Raw Analog: ");
  Serial.print(avg_analog);
  Serial.print(" | Voltage: ");
  Serial.print(voltage, 3);
  Serial.print("V");
  
  // Calculate estimated pH using typical values (for reference only)
  // This is just to give you an idea - use buffer solutions for accurate calibration
  float estimated_ph = -5.70 * voltage + 21.34;
  Serial.print(" | Estimated pH: ");
  Serial.print(estimated_ph, 2);
  
  Serial.println();
  
  // Instructions
  Serial.println("---");
  Serial.println("For pH 7.0 buffer: Record the Voltage value above");
  Serial.println("For pH 4.0 buffer: Record the Voltage value above");
  Serial.println("Use these values in Arduino_pH_Meter_Improved.ino");
  Serial.println("---");
  Serial.println();
  
  delay(2000);
}

