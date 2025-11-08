import serial
import serial.tools.list_ports
import requests
import time
import os

def find_arduino(port_name=None):
    """
    Find Arduino port automatically or use specified port.
    
    Args:
        port_name: Optional port name (e.g., 'COM3', '/dev/ttyUSB0')
                  If None, auto-detects Arduino
    
    Returns:
        Port device name or None if not found
    """
    # If specific port is requested, verify it exists
    if port_name:
        ports = serial.tools.list_ports.comports()
        for port in ports:
            if port.device == port_name:
                print(f"Using specified port: {port_name}")
                return port.device
        print(f"Warning: Specified port '{port_name}' not found!")
        print("Available ports:")
        for port in ports:
            print(f"  - {port.device} ({port.description})")
        return None
    
    # Auto-detect Arduino
    ports = serial.tools.list_ports.comports()
    print("Searching for Arduino...")
    print("Available ports:")
    for port in ports:
        print(f"  - {port.device}: {port.description}")
        if "Arduino" in port.description or "CH340" in port.description or "USB Serial" in port.description:
            print(f"  >>> Found Arduino on {port.device}! <<<")
            return port.device
    
    return None

def interpret_ph_status(ph):
    if ph < 0.0 or ph > 14.0:
        return "Not in H2O"
    elif 6.5 <= ph <= 8.0:
        return "SAFE"
    elif 4.1 <= ph < 6.5:
        return "ACIDIC"
    elif 8.0 < ph <= 9.5:
        return "ALKALINE"
    elif ph <= 4.0:
        return "DNG ACIDIC"
    elif ph > 9.5:
        return "DNG ALKALINE"
    else:
        return "UNKNOWN"

arduino = None
last_data_sent = ""  # Track last sent data to avoid duplicates
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0',
    'Content-Type': 'application/json'
})

# Use Next.js API endpoint (change to your server URL if deploying)
# For local development, use: http://localhost:3000/api/iot-data or http://localhost:3001/api/iot-data
# For production, use: https://smartfishcare.site/api/iot-data

# Check if config.py exists (for custom configuration)
try:
    import config
    API_URL = getattr(config, 'API_URL', None)
    ARDUINO_PORT = getattr(config, 'ARDUINO_PORT', None)
    REQUEST_TIMEOUT = getattr(config, 'REQUEST_TIMEOUT', 10)
except ImportError:
    # Default configuration (no config.py file)
    API_URL = None
    ARDUINO_PORT = None
    REQUEST_TIMEOUT = 10

# Check environment variable first, then config.py, then default
API_URL = os.getenv('IOT_API_URL', API_URL or 'https://smartfishcare.site/api/iot-data')

# For local development, you can:
# 1. Set environment variable: set IOT_API_URL=http://localhost:3001/api/iot-data
# 2. Create config.py file (see config.py.example)
# 3. Uncomment the line below:
# API_URL = "http://localhost:3001/api/iot-data"

url = API_URL
print(f"📡 IoT Server configured to send data to: {url}")

# OPTIONAL: Specify Arduino port manually (e.g., 'COM3', 'COM4', '/dev/ttyUSB0')
# Leave as None to auto-detect, or set in config.py
# ARDUINO_PORT can be set in config.py or left as None for auto-detection

def parse_arduino_data(raw_data):
    """
    Parse Arduino output to extract sensor data.
    Arduino sends: ph_value=8.25&temperature=28.87&status=ALKALINE
    """
    try:
        # Check if this line contains the actual data
        if not ('ph_value=' in raw_data and 'temperature=' in raw_data):
            return None  # Not a data line, skip silently
        
        # Parse the key=value pairs
        parts = {}
        for pair in raw_data.split('&'):
            if '=' in pair:
                key, value = pair.split('=', 1)
                parts[key.strip()] = value.strip()
        
        if 'ph_value' not in parts or 'temperature' not in parts:
            return None
        
        ph = round(float(parts['ph_value']), 2)
        temp = round(float(parts['temperature']), 2)
        status = parts.get('status', interpret_ph_status(ph))  # Get status or calculate it
        
        return {
            'ph_value': ph,
            'temperature': temp,
            'status': status
        }
    except (ValueError, KeyError) as e:
        # Silently skip invalid lines (debug messages, etc.)
        return None
    except Exception as e:
        # Only print error for unexpected issues
        print(f"Unexpected error parsing data: {e}")
        return None

print("Starting Smart Fish Care Sensor Uploader... (Press Ctrl+C to stop)")

try:
    while True:
        if arduino is None or not arduino.is_open:
            arduino_port = find_arduino(ARDUINO_PORT)
            if arduino_port:
                try:
                    arduino = serial.Serial(arduino_port, 9600, timeout=1)
                    print(f"Connected to Arduino on {arduino_port}")
                    # No delay - start reading immediately
                except serial.SerialException as e:
                    print(f"\nERROR: Could not open port {arduino_port}")
                    print(f"Error details: {e}")
                    print("\nPossible solutions:")
                    print("  1. Close Arduino IDE or any other program using COM3")
                    print("  2. Unplug and reconnect the Arduino USB cable")
                    print("  3. Check Device Manager to see if COM3 is available")
                    print("  4. Try a different USB port")
                    print("\nRetrying in 2 seconds...\n")
                    arduino = None
                    time.sleep(2)
                    continue
            else:
                print("Arduino not found. Retrying in 2 seconds...")
                time.sleep(2)
                continue

        try:
            line = arduino.readline().decode(errors='ignore').strip()
        except serial.SerialException:
            print("Connection lost. Attempting to reconnect...")
            if arduino:
                try:
                    arduino.close()
                except:
                    pass
            arduino = None
            time.sleep(1)  # Quick reconnect
            continue

        if line:
            # Only parse lines that contain sensor data
            parsed = parse_arduino_data(line)
            if parsed:
                ph = parsed['ph_value']
                temp = parsed['temperature']
                status = parsed['status']  # Get status from Arduino data

                # Create a unique key for this data combination
                data_key = f"{ph}_{temp}_{status}"
                
                # Send data in real-time (always send, let server handle duplicates)
                print(f"\n📊 Sensor Data Received:")
                print(f"   pH: {ph} | Temperature: {temp} °C | Status: {status}")
                
                try:
                    # Send as JSON to Next.js API (real-time updates)
                    # Send all three values: ph_value, temperature, and status
                    payload = {
                        'ph_value': ph,
                        'temperature': temp,
                        'status': status
                    }
                    response = session.post(url, json=payload, timeout=REQUEST_TIMEOUT)
                    
                    if response.status_code == 200:
                        result = response.json()
                        if result.get('status') == 'success':
                            print(f"✅ Data uploaded to Supabase successfully!")
                            print(f"   Database ID: {result.get('data', {}).get('id', 'N/A')}")
                            print(f"   Timestamp: {result.get('data', {}).get('timestamp', 'N/A')}")
                        else:
                            print(f"⚠️  Server response: {result.get('message', 'Unknown response')}")
                        last_data_sent = data_key
                    else:
                        print(f"⚠️  Server returned status code {response.status_code}")
                        try:
                            error_data = response.json()
                            print(f"   Error: {error_data.get('message', response.text)}")
                        except:
                            print(f"   Response: {response.text}")
                except requests.exceptions.ConnectionError as e:
                    print(f"❌ Connection Error: Cannot reach server at {url}")
                    print(f"   Make sure Next.js server is running and accessible")
                    print(f"   Error details: {e}")
                except requests.exceptions.Timeout:
                    print(f"❌ Timeout: Server took too long to respond (10s timeout)")
                    print(f"   Check your network connection or server status")
                except requests.exceptions.RequestException as e:
                    print(f"❌ Network Error: {e}")
                except Exception as e:
                    print(f"❌ Unexpected error: {e}")
            # Silently skip debug messages and other non-data lines

    

except KeyboardInterrupt:
    print("\nExiting Smart Fish Care live sender. Goodbye!")
    if arduino:
        arduino.close()
