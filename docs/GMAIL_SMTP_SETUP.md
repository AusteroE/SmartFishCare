# Gmail SMTP Setup Guide

## Quick Setup

Your Gmail SMTP credentials have been configured. You need to add them to your `.env.local` file.

## Step 1: Create `.env.local` file

Create a file named `.env.local` in the root directory of your project with the following content:

```env
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=fishcaresmart@gmail.com
SMTP_PASSWORD=fgvtwiguhmcdwez
FROM_EMAIL=fishcaresmart@gmail.com
FROM_NAME=Smart Fish Care System

# Application URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Database (PostgreSQL) - Update with your actual database URL
DATABASE_URL="your_database_url_here"

# JWT Secret - Change this to a secure random string
JWT_SECRET=your-secret-key-change-this
```

## Step 2: Restart Your Development Server

After creating or updating `.env.local`, restart your Next.js development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev
```

## Configuration Details

- **SMTP_HOST**: `smtp.gmail.com` (Gmail's SMTP server)
- **SMTP_PORT**: `587` (TLS/STARTTLS port)
- **SMTP_USER**: Your Gmail address (`fishcaresmart@gmail.com`)
- **SMTP_PASSWORD**: Your Gmail App Password (`fgvtwiguhmcdwez`)
- **FROM_EMAIL**: The email address that will appear as the sender
- **FROM_NAME**: The display name for the sender

## Testing Email Functionality

1. **Sign Up Test**: Create a new account and check if verification email is received
2. **OTP Test**: Sign up and check for OTP code in the email
3. **Check Console**: Monitor the server console for email sending logs

## Troubleshooting

### Email Not Sending?

1. **Check Environment Variables**: Make sure `.env.local` exists and has correct values
2. **Restart Server**: Environment variables are loaded at startup
3. **Check Console Logs**: Look for error messages in the terminal
4. **Verify App Password**: Ensure the Gmail App Password is correct (no spaces)

### Common Errors

- **EAUTH Error**: Authentication failed - check your SMTP_USER and SMTP_PASSWORD
- **Connection Timeout**: Check your internet connection
- **Invalid Credentials**: Verify your Gmail App Password is correct

## Security Notes

⚠️ **Important**: 
- Never commit `.env.local` to git (it's already in `.gitignore`)
- Keep your Gmail App Password secure
- Don't share your credentials publicly

## Gmail App Password Setup (If Needed)

If you need to generate a new App Password:

1. Go to your Google Account settings
2. Navigate to **Security** → **2-Step Verification**
3. Scroll down to **App passwords**
4. Select **Mail** and **Other (Custom name)**
5. Enter "Smart Fish Care" as the name
6. Click **Generate**
7. Copy the 16-character password (remove spaces when using)

## Email Features

The system now supports:
- ✅ Email verification with verification link
- ✅ OTP (One-Time Password) codes via email
- ✅ Beautiful HTML email templates
- ✅ Error handling and logging

## Next Steps

After setting up `.env.local`:
1. Restart your development server
2. Test email functionality by signing up a new account
3. Check your email inbox (and spam folder) for verification emails

