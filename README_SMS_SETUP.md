# SMS Notification Setup

This application uses [Semaphore API](https://api.semaphore.co/api/v4/messages) to send SMS notifications when large fish are detected.

## Features

- ✅ Automatic SMS notifications when large fish are detected
- ✅ Throttled to once per 2 minutes (prevents spam)
- ✅ Message limited to 50 characters
- ✅ Secure API key configuration via environment variables

## Setup Instructions

### 1. Get Semaphore API Key

1. Sign up at [Semaphore](https://semaphore.co/)
2. Get your API key from the dashboard
3. Note: You'll need a sender name (registered with Semaphore)

### 2. Configure Environment Variables

Add these to your `.env.local` file:

```env
# Semaphore SMS API Configuration
SEMAPHORE_API_KEY=your_api_key_here
SEMAPHORE_SENDER_NAME=SmartFish
DEFAULT_PHONE_NUMBER=+1234567890
```

**Important Notes:**
- `SEMAPHORE_API_KEY`: Your Semaphore API key (required)
- `SEMAPHORE_SENDER_NAME`: Your registered sender name (defaults to "SmartFish" if not set)
- `DEFAULT_PHONE_NUMBER`: Default phone number to send SMS to (required if user doesn't have phone number in profile)

### 3. Phone Number Format

- Use international format with country code
- Example: `+639123456789` (Philippines), `+1234567890` (USA)

### 4. How It Works

1. When a **large fish** is detected, the system automatically sends an SMS
2. SMS is throttled to **once per 2 minutes** to prevent spam
3. Message is automatically truncated to **50 characters maximum**
4. Example message: `Large fish detected! 25.5cm x 12.3cm`

### 5. API Endpoint

The SMS API endpoint is available at:
- **POST** `/api/sms/send`
- Requires authentication (user must be logged in)
- Parameters:
  - `message` (required): SMS message (max 50 chars)
  - `phoneNumber` (optional): Override default phone number

### 6. Testing

To test the SMS functionality:

1. Make sure environment variables are set
2. Start fish detection
3. Detect a large fish
4. Check console logs for SMS send status

## Troubleshooting

### SMS Not Sending

1. Check that `SEMAPHORE_API_KEY` is set correctly
2. Verify `DEFAULT_PHONE_NUMBER` is in correct format
3. Check Semaphore dashboard for API quota/limits
4. Look for error messages in browser console

### Throttle Message

If you see "SMS throttle active", wait 2 minutes between SMS sends. This is by design to prevent spam.

## Future Enhancements

- Add phone number field to user profile
- Allow users to configure their own phone number
- SMS notification preferences in settings
- Multiple recipient support
