# IoT Server Configuration for Local Development
# This file configures the IoT server to use localhost

# API Endpoint Configuration
# For local development:
# IMPORTANT: Make sure Next.js server is running on this port
API_URL = "http://localhost:3000/api/iot-data"  # Port 3000 (default Next.js port)

# For production (uncomment when deploying):
# API_URL = "https://smartfishcare.site/api/iot-data"

# Arduino Port Configuration
# Leave as None to auto-detect, or specify manually (e.g., 'COM3', 'COM4')
ARDUINO_PORT = None

# Request timeout in seconds
REQUEST_TIMEOUT = 10

