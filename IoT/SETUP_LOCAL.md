# Local Development Setup Guide

## Quick Start for Local Testing

### 1. Start Next.js Server

Make sure your Next.js development server is running:
```bash
npm run dev
```

The server should be accessible at `http://localhost:3000` or `http://localhost:3001`

### 2. Configure IoT Server for Local Development

The `config.py` file is already configured for local development. It points to:
```
http://localhost:3001/api/iot-data
```

### 3. Run IoT Server

```bash
cd IoT
python server.py
```

The server will automatically use the `config.py` file and connect to your local Next.js server.

## Verify Data Upload

### Check Server Logs

When data is successfully uploaded, you'll see:
```
✅ Data uploaded to Supabase successfully!
   Database ID: 123
   Timestamp: 2024-11-08T03:30:21.780Z
```

### Check Next.js Server Logs

In your Next.js terminal, you should see:
```
✅ Sensor data saved to Supabase: {
  id: 123,
  ph: 8.91,
  temperature: 30.81,
  timestamp: 2024-11-08T03:30:21.780Z
}
```

### View Data in Prisma Studio

```bash
npm run db:studio
```

Browse to the `SensorData` table to see your uploaded data.

### Test API Endpoints

**Test POST (Upload Data):**
```bash
python -c "import requests; r = requests.post('http://localhost:3001/api/iot-data', json={'ph_value': 8.91, 'temperature': 30.81}); print(r.json())"
```

**Test GET (Retrieve Data):**
```bash
python -c "import requests; r = requests.get('http://localhost:3001/api/iot-data'); print(r.json())"
```

## Switch to Production

When ready to use production:

1. Edit `IoT/config.py`:
   ```python
   API_URL = "https://smartfishcare.site/api/iot-data"
   ```

2. Or set environment variable:
   ```bash
   set IOT_API_URL=https://smartfishcare.site/api/iot-data
   ```

## Troubleshooting

### "Connection Error: Cannot reach server"
- Make sure Next.js server is running (`npm run dev`)
- Check if server is on port 3000 or 3001
- Verify `config.py` has the correct URL

### "Server returned status code 500"
- Check Next.js server logs for error details
- Verify database connection in `.env` file
- Make sure Prisma Client is generated: `npm run db:generate`

### "Arduino not found"
- Check USB connection
- Verify Arduino is powered on
- Check Device Manager for COM port
- Update `ARDUINO_PORT` in `config.py` if needed

