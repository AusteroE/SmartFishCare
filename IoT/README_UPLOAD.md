# IoT Sensor Data Upload to Supabase

This guide explains how to upload sensor data from your Arduino IoT device to Supabase via the Next.js API.

## Data Flow

```
Arduino → IoT Server (Python) → Next.js API → Prisma → Supabase Database
```

## Setup Instructions

### 1. Configure API Endpoint

The IoT server can be configured in three ways (in order of priority):

#### Option A: Environment Variable (Recommended for Production)
```bash
set IOT_API_URL=https://smartfishcare.site/api/iot-data
python server.py
```

#### Option B: Config File (Recommended for Local Development)
1. Copy `config.py.example` to `config.py`:
   ```bash
   copy config.py.example config.py
   ```

2. Edit `config.py` and set your API URL:
   ```python
   API_URL = "http://localhost:3001/api/iot-data"  # For local development
   # API_URL = "https://smartfishcare.site/api/iot-data"  # For production
   ```

#### Option C: Direct Edit
Edit `server.py` and uncomment/modify the API_URL line.

### 2. Start Next.js Server

Make sure your Next.js server is running:
```bash
npm run dev
```

The server should be accessible at:
- Local: `http://localhost:3000` or `http://localhost:3001`
- Production: `https://smartfishcare.site`

### 3. Run IoT Server

```bash
cd IoT
python server.py
```

Or use the batch file:
```bash
run.bat
```

## Verification

### Check Server Logs

When data is successfully uploaded, you'll see:
```
✅ Data uploaded to Supabase successfully!
   Database ID: 123
   Timestamp: 2024-01-15T10:30:00.000Z
```

### Check Next.js Server Logs

In your Next.js terminal, you should see:
```
✅ Sensor data saved to Supabase: {
  id: 123,
  ph: 7.5,
  temperature: 25.3,
  timestamp: 2024-01-15T10:30:00.000Z
}
```

### Check Prisma Studio

View the data in Supabase:
```bash
npm run db:studio
```

Then browse to the `SensorData` table to see your uploaded data.

## Troubleshooting

### Connection Errors

**Error: "Connection Error: Cannot reach server"**
- Make sure Next.js server is running
- Check the API URL in `server.py` or `config.py`
- Verify the URL is accessible (try in browser)

**Error: "Timeout: Server took too long to respond"**
- Check your network connection
- Verify the server is not overloaded
- Increase `REQUEST_TIMEOUT` in `config.py`

### Database Errors

**Error: "Database error: ..."**
- Check your `DATABASE_URL` in `.env` file
- Verify Prisma Client is generated: `npm run db:generate`
- Check Supabase connection status

### Arduino Connection Errors

**Error: "Arduino not found"**
- Check USB connection
- Verify Arduino is powered on
- Check Device Manager for COM port
- Try specifying port manually in `config.py`:
  ```python
  ARDUINO_PORT = "COM3"  # Replace with your port
  ```

## Data Format

The IoT server sends JSON data in this format:
```json
{
  "ph_value": 7.5,
  "temperature": 25.3,
  "status": "SAFE"
}
```

The API endpoint saves `ph_value` and `temperature` to the Supabase `sensor_data` table.

## Testing Without Arduino

You can test the upload without Arduino by sending a POST request:

```bash
curl -X POST http://localhost:3001/api/iot-data \
  -H "Content-Type: application/json" \
  -d '{"ph_value": 7.5, "temperature": 25.3}'
```

## Production Deployment

For production:
1. Set `API_URL` to your production domain: `https://smartfishcare.site/api/iot-data`
2. Ensure your Next.js app is deployed and running
3. Verify the API endpoint is publicly accessible
4. Test the connection before deploying the IoT server

