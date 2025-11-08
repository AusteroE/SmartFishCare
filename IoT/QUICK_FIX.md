# Quick Fix: Connection Error

## Problem
```
❌ Connection Error: Cannot reach server at http://localhost:3001/api/iot-data
```

## Solution

### Step 1: Check Next.js Server Port

The Next.js server is running on **port 3000**, not 3001.

### Step 2: Update IoT Config

The `config.py` file is already set to port 3000, but if you're still getting errors:

1. **Stop the IoT server** (Ctrl+C)

2. **Verify config.py** has:
   ```python
   API_URL = "http://localhost:3000/api/iot-data"
   ```

3. **Restart IoT server**:
   ```bash
   cd IoT
   python server.py
   ```

### Step 3: Verify Next.js Server is Running

Check if Next.js is running:
```bash
# Windows PowerShell
netstat -ano | findstr :3000
```

You should see:
```
TCP    0.0.0.0:3000    LISTENING
```

### Step 4: Test Connection

Test if the API is accessible:
```bash
python -c "import requests; r = requests.get('http://localhost:3000/api/iot-data'); print(r.json())"
```

Should return:
```json
{"status": "fetched", "message": "No sensor data received yet.", "data": {"ph": null, "temperature": null}}
```

## Common Issues

### Issue 1: Server Not Running
**Solution**: Start Next.js server
```bash
npm run dev
```

### Issue 2: Wrong Port
**Solution**: Check which port Next.js is using and update config.py

### Issue 3: Firewall Blocking
**Solution**: Allow Node.js through Windows Firewall

### Issue 4: Config Not Loading
**Solution**: Make sure you're running from the IoT directory:
```bash
cd IoT
python server.py
```

## Quick Test

Run this to test the connection:
```bash
python -c "import requests; r = requests.post('http://localhost:3000/api/iot-data', json={'ph_value': 7.5, 'temperature': 25.0}); print(f'Status: {r.status_code}'); print(r.json())"
```

Expected output:
```
Status: 200
{'status': 'success', 'message': 'Data updated in real-time (displayed on dashboard)', 'data': {'ph': 7.5, 'temperature': 25.0, 'timestamp': '...'}}
```

