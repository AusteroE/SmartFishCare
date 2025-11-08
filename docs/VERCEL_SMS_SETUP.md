# Vercel SMS Service Configuration

## Error Message
When you see the error: **"SMS service not configured. Please contact administrator."**

This means the `SEMAPHORE_API_KEY` environment variable is not set in your Vercel deployment.

## Solution

### Step 1: Get Your Semaphore API Key
1. Sign up at [Semaphore](https://semaphore.co/)
2. Get your API key from the dashboard
3. Note your registered sender name (default: "SmartFish")

### Step 2: Configure Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following environment variables:

   ```
   SEMAPHORE_API_KEY=your_api_key_here
   SEMAPHORE_SENDER_NAME=SmartFish
   DEFAULT_PHONE_NUMBER=+639123456789
   ```

### Step 3: Redeploy Your Application

After adding the environment variables:
1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Select **"Redeploy"**
4. This will trigger a new deployment with the updated environment variables

### Step 4: Verify Configuration

1. Go to your application's Settings page
2. Try to send an OTP to verify your phone number
3. If configured correctly, you should receive an SMS with the OTP code

## Alternative: Check Environment Variables Locally

If you want to test locally, add these to your `.env.local` file:

```env
SEMAPHORE_API_KEY=your_api_key_here
SEMAPHORE_SENDER_NAME=SmartFish
DEFAULT_PHONE_NUMBER=+639123456789
```

## Phone Number Format

The application now automatically adds the **+63** prefix for Philippine phone numbers:

- Type: `09123456789` → Automatically becomes: `+639123456789`
- Type: `9192345678` → Automatically becomes: `+639192345678`
- Type: `+639123456789` → Stays as: `+639123456789`

## Troubleshooting

### Still seeing the error after configuration?
1. Make sure you **redeployed** after adding environment variables
2. Check that the environment variable name is exactly `SEMAPHORE_API_KEY` (case-sensitive)
3. Verify your API key is valid by testing it on Semaphore's dashboard
4. Check Vercel deployment logs for any errors

### SMS not sending?
1. Verify your Semaphore account has credits
2. Check that the phone number format is correct (international format)
3. Ensure your sender name is registered with Semaphore
4. Check Vercel function logs for detailed error messages

## Support

If issues persist:
- Check Vercel function logs: Vercel Dashboard → Your Project → Functions → Logs
- Verify Semaphore API status: https://semaphore.co/
- Check Semaphore API documentation: https://semaphore.co/docs

