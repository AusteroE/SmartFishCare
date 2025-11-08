# Dashboard Sensor Data Display - Troubleshooting Guide

## Problem: Sensor data not displaying on dashboard

## Debugging Steps

### 1. Check Browser Console
Open browser DevTools (F12) and check the Console tab for:
- `SSE connection opened` - Should appear when page loads
- `SSE message received:` - Should appear when data arrives
- `Parsed SSE data:` - Should show the data object
- `Setting sensor data:` - Should show the data being set

### 2. Check Server Logs
In your Next.js server terminal, look for:
- `Sensor data updated in memory:` - When IoT server sends data
- `SSE: Sent initial data to client:` - When SSE sends data
- `SSE: Sent updated data to client:` - When data updates

### 3. Test API Endpoints

**Test POST (Send data):**
```bash
python -c "import requests; r = requests.post('http://localhost:3000/api/iot-data', json={'ph_value': 8.92, 'temperature': 34.38}); print(r.json())"
```

**Test GET (Retrieve data):**
```bash
python -c "import requests; r = requests.get('http://localhost:3000/api/iot-data'); print(r.json())"
```

**Test SSE Stream:**
```bash
curl -N http://localhost:3000/api/iot-data/stream
```

### 4. Verify IoT Server is Running
```bash
cd IoT
python server.py
```

Should show:
```
📡 IoT Server configured to send data to: http://localhost:3000/api/iot-data
Connected to Arduino on COM3
📊 Sensor Data Received:
   pH: 8.92 | Temperature: 34.38 °C | Status: ALKALINE
✅ Data uploaded to Supabase successfully!
```

### 5. Check Network Tab
In browser DevTools → Network tab:
- Look for `/api/iot-data/stream` request
- Should show status 200
- Should show `text/event-stream` content type
- Check if data is being received

## Common Issues

### Issue 1: SSE Not Connecting
**Symptoms**: No "SSE connection opened" in console
**Solution**: 
- Check if Next.js server is running
- Check browser console for CORS errors
- Try refreshing the page

### Issue 2: Data Not Updating
**Symptoms**: Initial data shows but doesn't update
**Solution**:
- Check server logs for "Sensor data updated in memory"
- Verify IoT server is sending data
- Check SSE stream is receiving updates

### Issue 3: Data Shows as "No Data"
**Symptoms**: Connection shows "Connected" but cards show "No Data"
**Solution**:
- Check validation logic in browser console
- Verify pH and temperature values are in valid ranges
- Check if data is being filtered out by validation

### Issue 4: Validation Failing
**Symptoms**: Data received but not displayed
**Check**:
- pH must be between 0.0 and 14.0
- Temperature must be between -20 and 100
- Check console for "Data validation failed"

## Quick Fixes

### Fix 1: Restart Everything
1. Stop IoT server (Ctrl+C)
2. Stop Next.js server (Ctrl+C)
3. Start Next.js: `npm run dev`
4. Start IoT server: `cd IoT && python server.py`
5. Refresh dashboard page

### Fix 2: Clear Browser Cache
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or clear browser cache and reload

### Fix 3: Check Port Configuration
- Verify Next.js is on port 3000
- Verify IoT config.py points to port 3000
- Check: `netstat -ano | findstr :3000`

## Expected Behavior

### When Working Correctly:
1. **Page Loads**: 
   - Initial data fetch happens
   - SSE connection opens
   - "SSE connection opened" in console

2. **Data Arrives**:
   - Server logs: "Sensor data updated in memory"
   - Server logs: "SSE: Sent updated data to client"
   - Browser console: "SSE message received"
   - Browser console: "Setting sensor data"
   - Dashboard cards update with values

3. **Real-Time Updates**:
   - Data updates every 500ms via SSE
   - Dashboard reflects latest values immediately

## Still Not Working?

1. **Check all console logs** (browser and server)
2. **Verify IoT server is actually sending data**
3. **Test API endpoints directly** (see step 3 above)
4. **Check for JavaScript errors** in browser console
5. **Verify network connectivity** between IoT server and Next.js

## Test Script

Run this to simulate sensor data:
```bash
python -c "
import requests
import time
for i in range(5):
    ph = 7.0 + (i * 0.1)
    temp = 25.0 + (i * 0.5)
    r = requests.post('http://localhost:3000/api/iot-data', json={'ph_value': ph, 'temperature': temp})
    print(f'Sent: pH={ph}, Temp={temp}, Status={r.status_code}')
    time.sleep(1)
"
```

Then check the dashboard - you should see values updating in real-time.

