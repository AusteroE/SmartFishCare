"""
Test script to verify IoT data upload to Supabase without Arduino.
This script simulates sensor data and sends it to the API endpoint.
"""

import requests
import time
import random

# Configuration
API_URL = "http://localhost:3000/api/iot-data"  # Change to your server URL
# API_URL = "https://smartfishcare.site/api/iot-data"  # For production

def test_upload(ph_value, temperature):
    """Test uploading sensor data to the API."""
    try:
        payload = {
            'ph_value': ph_value,
            'temperature': temperature,
            'status': 'SAFE'  # Optional status field
        }
        
        print(f"\n[Sending test data]")
        print(f"   pH: {ph_value} | Temperature: {temperature} C")
        
        response = requests.post(API_URL, json=payload, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('status') == 'success':
                print(f"[SUCCESS] Data uploaded to Supabase successfully!")
                print(f"   Database ID: {result.get('data', {}).get('id', 'N/A')}")
                print(f"   Timestamp: {result.get('data', {}).get('timestamp', 'N/A')}")
                return True
            else:
                print(f"[WARNING] Server response: {result.get('message', 'Unknown response')}")
                return False
        else:
            print(f"[ERROR] Server returned status code {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('message', response.text)}")
            except:
                print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"[ERROR] Connection Error: Cannot reach server at {API_URL}")
        print(f"   Make sure Next.js server is running")
        return False
    except requests.exceptions.Timeout:
        print(f"[ERROR] Timeout: Server took too long to respond")
        return False
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}")
        return False

def main():
    print("=" * 60)
    print("IoT Sensor Data Upload Test")
    print("=" * 60)
    print(f"API URL: {API_URL}")
    print("=" * 60)
    
    # Test 1: Valid data
    print("\n[Test 1] Uploading valid sensor data...")
    success = test_upload(7.5, 25.3)
    
    if not success:
        print("\n[ERROR] Test failed! Make sure:")
        print("   1. Next.js server is running")
        print("   2. API URL is correct")
        print("   3. Database connection is working")
        return
    
    # Wait a bit
    time.sleep(1)
    
    # Test 2: Different values
    print("\n[Test 2] Uploading different sensor data...")
    test_upload(8.2, 27.1)
    
    time.sleep(1)
    
    # Test 3: Simulate multiple readings
    print("\n[Test 3] Simulating multiple sensor readings...")
    for i in range(3):
        ph = round(random.uniform(6.5, 8.0), 2)
        temp = round(random.uniform(24.0, 27.0), 2)
        test_upload(ph, temp)
        time.sleep(0.5)
    
    print("\n" + "=" * 60)
    print("[SUCCESS] Test completed!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Check your Next.js server logs for confirmation")
    print("2. Open Prisma Studio: npm run db:studio")
    print("3. View the SensorData table to see uploaded data")

if __name__ == "__main__":
    main()

