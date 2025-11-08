# Smart Fish Care - IoT Server

This Python script connects your Arduino pH and temperature sensors to the Next.js web application.

## 📋 Requirements

- Python 3.7 or higher
- Arduino with pH sensor and DS18B20 temperature sensor
- USB connection between Arduino and computer

## 🔍 Finding Your Arduino Port

### Quick Method:
**Windows:**
```
Double-click: list_ports.bat
```

**Linux/Mac:**
```bash
python list_ports.py
```

Or run manually:
```bash
python list_ports.py
```

This will show all available serial ports and highlight which one looks like an Arduino.

### Manual Method:

**Windows:**
1. Open Device Manager
2. Expand "Ports (COM & LPT)"
3. Look for "Arduino" or "CH340" - note the COM number (e.g., COM3)

**Linux:**
```bash
ls /dev/tty* | grep -E "(USB|ACM)"
```

**Mac:**
```bash
ls /dev/tty.usb*
```

## ⚙️ Using a Specific Port

If auto-detection doesn't work, edit `server.py`:

```python
# Change this line:
ARDUINO_PORT = None  # Auto-detect

# To your port:
ARDUINO_PORT = 'COM3'  # Windows
# or
ARDUINO_PORT = '/dev/ttyUSB0'  # Linux
# or
ARDUINO_PORT = '/dev/tty.usbmodem14101'  # Mac
```

## 🚀 Quick Start

### Windows:

1. **First Time Setup:**
   ```
   Double-click: setup_venv.bat
   ```

2. **Find Your Arduino Port:**
   ```
   Double-click: list_ports.bat
   ```
   Note the port name (e.g., COM3)

3. **Edit server.py (if needed):**
   - Set `ARDUINO_PORT = 'COM3'` (use your port)

4. **Run the Server:**
   ```
   Double-click: run_server.bat
   ```
   Or manually:
   ```
   activate_venv.bat
   python server.py
   ```

### Linux/Mac:

1. **First Time Setup:**
   ```bash
   chmod +x setup_venv.sh
   bash setup_venv.sh
   ```

2. **Find Your Arduino Port:**
   ```bash
   python list_ports.py
   ```

3. **Edit server.py (if needed):**
   - Set `ARDUINO_PORT = '/dev/ttyUSB0'` (use your port)

4. **Run the Server:**
   ```bash
   chmod +x run_server.sh
   bash run_server.sh
   ```
   Or manually:
   ```bash
   source venv/bin/activate
   python server.py
   ```

## 📦 Manual Setup

If the scripts don't work, you can set up manually:

1. **Create virtual environment:**
   ```bash
   python -m venv venv
   ```

2. **Activate virtual environment:**
   - Windows: `venv\Scripts\activate`
   - Linux/Mac: `source venv/bin/activate`

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the server:**
   ```bash
   python server.py
   ```

## 🔌 Arduino Connection

The script automatically detects Arduino on common ports. If it doesn't work:

1. Run `list_ports.py` to see available ports
2. Edit `server.py` and set `ARDUINO_PORT` to your specific port
3. Make sure Arduino is connected via USB before running

## 📊 Data Format

The Arduino should send data in this format:
```
ph_value=7.25&temperature=25.5
```

The script will:
1. Parse the data from Arduino Serial
2. Send it to the Next.js API as JSON
3. Display the values in the console

## 🐛 Troubleshooting

### "Could not open port" / "Port already in use"

**Windows Fix:**
1. **Close Arduino IDE** - This is the most common cause
2. **Close Serial Monitor** if it's open
3. **Run fix_port.bat** to check and fix port issues
4. **Disable and re-enable the port** in Device Manager:
   - Open Device Manager (run `devmgmt.msc`)
   - Expand "Ports (COM & LPT)"
   - Right-click your Arduino port → Disable
   - Right-click again → Enable
5. **Unplug and reconnect** the Arduino USB cable
6. **Try a different USB port** on your computer

**Quick Fix:**
```cmd
# Close all programs, then:
python server.py
```

### "Arduino not found"
- Make sure Arduino is connected via USB
- Run `list_ports.py` to see available ports
- Set `ARDUINO_PORT` manually in `server.py`
- Try unplugging and reconnecting the Arduino

### "Network Error"
- Make sure Next.js server is running on `http://localhost:3000`
- Check the API endpoint URL in `server.py`
- Verify your firewall isn't blocking the connection

### "Module not found"
- Make sure virtual environment is activated
- Run: `pip install -r requirements.txt`

## 📝 Notes

- The script only sends data when values change significantly
- Data is sent every time Arduino outputs new readings
- Console shows real-time sensor readings
- Press `Ctrl+C` to stop the server
