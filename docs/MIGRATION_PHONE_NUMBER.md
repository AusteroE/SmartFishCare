# Phone Number Field Migration

This document explains how to add the phone number field to your database.

## Steps to Apply Changes

### 1. Stop the Development Server

Stop your Next.js development server (if running) to release file locks.

### 2. Generate Prisma Client

Run the following command to regenerate the Prisma client with the new phone number field:

```bash
npx prisma generate
```

### 3. Push Schema Changes to Database

If you're using PostgreSQL (as per your schema), run:

```bash
npx prisma db push
```

Or if you prefer using migrations:

```bash
npx prisma migrate dev --name add_phone_number
```

### 4. Restart Development Server

After the migration is complete, restart your development server:

```bash
npm run dev
```

## What Changed

- **Prisma Schema**: Added `phoneNumber` field to User model (optional, nullable)
- **Settings Panel**: Added phone number input field
- **API Routes**: Updated to handle phone number in user profile
- **SMS Integration**: SMS notifications now use phone number from user profile

## Phone Number Format

- Must use international format starting with `+`
- Example: `+639123456789` (Philippines), `+1234567890` (USA)
- Validated on the server side

## Testing

1. Go to Settings panel
2. Click "Edit" on your profile
3. Enter your phone number in international format (e.g., `+639123456789`)
4. Save the profile
5. When a large fish is detected, SMS will be sent to your phone number

## Troubleshooting

If you encounter errors:
1. Make sure the database is running
2. Check that Prisma client is regenerated
3. Verify the database connection in `.env.local`
4. Check browser console for any errors
