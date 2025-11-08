# Environment Variables Reference

This document lists all environment variables used throughout the Smart Fish Care codebase.

## Quick Reference

### Required Variables
- `DATABASE_URL` - Database connection string (required by Prisma)
- `JWT_SECRET` - Secret key for JWT token signing

### Required for Email Features
- `SMTP_USER` - SMTP username/email
- `SMTP_PASSWORD` - SMTP password/app password

### Required for SMS Features
- `SEMAPHORE_API_KEY` - Semaphore SMS API key

### Optional Variables
- All other variables have defaults or are optional

---

## Complete List by Category

### 1. Database Configuration

#### Required
```env
DATABASE_URL="postgres://user:password@host:5432/database?sslmode=require"
```
- **Used in**: `prisma/schema.prisma`, `src/lib/db.ts`
- **Description**: Prisma database connection URL
- **Note**: Use non-pooling connection (port 5432) for migrations

#### Optional (Supabase)
```env
POSTGRES_URL="postgres://user:password@host:6543/database?sslmode=require&supa=base-pooler.x"
POSTGRES_USER="postgres"
POSTGRES_HOST="db.project.supabase.co"
POSTGRES_PASSWORD="your_password"
POSTGRES_DATABASE="postgres"
POSTGRES_PRISMA_URL="postgres://user:password@host:6543/database?sslmode=require&pgbouncer=true"
POSTGRES_URL_NON_POOLING="postgres://user:password@host:5432/database?sslmode=require"
```
- **Used in**: Supabase-specific configurations
- **Description**: Additional PostgreSQL connection strings for Supabase

---

### 2. Supabase Configuration

#### Optional
```env
SUPABASE_URL="https://project.supabase.co"
SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
SUPABASE_JWT_SECRET="your_jwt_secret"
NEXT_PUBLIC_SUPABASE_URL="https://project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key"
```
- **Used in**: Supabase client configurations
- **Description**: Supabase API keys and URLs
- **Note**: `NEXT_PUBLIC_*` variables are accessible in the browser

---

### 3. Authentication

#### Required
```env
JWT_SECRET="your-secret-key-change-this"
```
- **Used in**: `src/lib/auth.ts`
- **Description**: Secret key for signing and verifying JWT tokens
- **Default**: `'your-secret-key-change-this'` (⚠️ Change in production!)

---

### 4. Email/SMTP Configuration

#### Required for Email Features
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
FROM_EMAIL="your-email@gmail.com"
FROM_NAME="Smart Fish Care System"
```
- **Used in**: `src/lib/email.ts`
- **Description**: SMTP server configuration for sending emails
- **Defaults**:
  - `SMTP_HOST`: `'smtp.gmail.com'`
  - `SMTP_PORT`: `'587'`
  - `FROM_NAME`: `'Smart Fish Care System'`
- **Note**: 
  - `FROM_EMAIL` can fallback to `SMTP_USER` if not set
  - For Gmail, use an App Password, not your regular password

---

### 5. SMS Configuration

#### Required for SMS Features
```env
SEMAPHORE_API_KEY="your_semaphore_api_key"
SEMAPHORE_SENDER_NAME="SmartFish"
DEFAULT_PHONE_NUMBER="+639123456789"
```
- **Used in**: 
  - `src/app/api/sms/send/route.ts`
  - `src/app/api/user/phone/send-otp/route.ts`
- **Description**: Semaphore SMS API configuration
- **Defaults**:
  - `SEMAPHORE_SENDER_NAME`: `'SmartFish'`
- **Note**: 
  - `DEFAULT_PHONE_NUMBER` is used as fallback if user doesn't have a phone number
  - Phone numbers should be in international format (e.g., `+639123456789`)

---

### 6. Application URLs

#### Optional
```env
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```
- **Used in**: 
  - `src/lib/email.ts` (verification and reset password links)
  - `src/app/api/records/export-pdf/route.ts` (PDF logo URLs)
- **Description**: Base URL of the application
- **Default**: `'http://localhost:3000'`
- **Note**: `NEXT_PUBLIC_*` variables are accessible in the browser

---

### 7. APK Build Configuration

#### Optional
```env
MANIFEST_URL="https://smartfishcare.site/manifest.json"
```
- **Used in**: `scripts/build-apk.js`
- **Description**: Manifest URL for APK building
- **Default**: `'https://smartfishcare.site/manifest.json'`

---

## Auto-Set Variables (Do Not Modify)

These variables are automatically set by the environment and should not be manually configured:

- `NODE_ENV` - Set by Next.js (`development` or `production`)
- `VERCEL` - Set by Vercel platform (`'1'` if on Vercel)
- `VERCEL_ENV` - Set by Vercel platform (`production`, `preview`, or `development`)

---

## Usage by File

### `src/lib/auth.ts`
- `JWT_SECRET` (required)
- `NODE_ENV` (auto-set)

### `src/lib/db.ts`
- `DATABASE_URL` (required, via Prisma)
- `NODE_ENV` (auto-set)

### `src/lib/email.ts`
- `SMTP_HOST` (optional, default: `'smtp.gmail.com'`)
- `SMTP_PORT` (optional, default: `'587'`)
- `SMTP_USER` (required)
- `SMTP_PASSWORD` (required)
- `FROM_EMAIL` (optional, falls back to `SMTP_USER`)
- `FROM_NAME` (optional, default: `'Smart Fish Care System'`)
- `NEXT_PUBLIC_BASE_URL` (optional, default: `'http://localhost:3000'`)

### `src/lib/upload-server.ts`
- `VERCEL` (auto-set)
- `VERCEL_ENV` (auto-set)

### `src/app/api/sms/send/route.ts`
- `SEMAPHORE_API_KEY` (required)
- `SEMAPHORE_SENDER_NAME` (optional, default: `'SmartFish'`)
- `DEFAULT_PHONE_NUMBER` (optional, fallback for SMS)

### `src/app/api/user/phone/send-otp/route.ts`
- `SEMAPHORE_API_KEY` (required)
- `SEMAPHORE_SENDER_NAME` (optional, default: `'SmartFish'`)

### `src/app/api/records/export-pdf/route.ts`
- `NEXT_PUBLIC_BASE_URL` (optional, default: `'http://localhost:3000'`)

### `prisma/schema.prisma`
- `DATABASE_URL` (required)

### `scripts/build-apk.js`
- `MANIFEST_URL` (optional, default: `'https://smartfishcare.site/manifest.json'`)

---

## Example `.env.local` File

```env
# Database
DATABASE_URL="postgres://user:password@host:5432/database?sslmode=require"

# Authentication
JWT_SECRET="your-secret-key-change-this-in-production"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
FROM_EMAIL="your-email@gmail.com"
FROM_NAME="Smart Fish Care System"

# SMS
SEMAPHORE_API_KEY="your_semaphore_api_key"
SEMAPHORE_SENDER_NAME="SmartFish"
DEFAULT_PHONE_NUMBER="+639123456789"

# Application URLs
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# Supabase (if using)
SUPABASE_URL="https://project.supabase.co"
SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
NEXT_PUBLIC_SUPABASE_URL="https://project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key"
```

---

## Security Notes

1. **Never commit `.env.local` to version control** - It's already in `.gitignore`
2. **Use strong secrets** - Generate random strings for `JWT_SECRET`
3. **Use App Passwords** - For Gmail, use App Passwords, not your regular password
4. **Rotate secrets regularly** - Especially in production
5. **Use different values** - Use different secrets for development and production

---

## Troubleshooting

### Email not sending?
- Check `SMTP_USER` and `SMTP_PASSWORD` are correct
- For Gmail, ensure you're using an App Password
- Verify `SMTP_HOST` and `SMTP_PORT` are correct

### SMS not working?
- Verify `SEMAPHORE_API_KEY` is set and valid
- Check `SEMAPHORE_SENDER_NAME` matches your registered sender name
- Ensure `DEFAULT_PHONE_NUMBER` is in international format

### Database connection errors?
- Verify `DATABASE_URL` is correct
- Check database server is accessible
- Ensure SSL mode matches your database configuration

### JWT authentication failing?
- Verify `JWT_SECRET` is set
- Ensure it's the same across all instances (if using multiple servers)
- Check token expiration settings in `src/lib/auth.ts`

