# 🚀 Supabase + Prisma Setup Guide

This guide will help you configure your Smart Fish Care application to use Supabase (PostgreSQL) with Prisma ORM.

## 📋 Prerequisites

- Node.js 18+ installed
- Supabase project created
- Supabase database credentials

## 🔧 Step 1: Create Environment File

Copy the `.env.example` file to `.env.local`:

```bash
# Windows
copy .env.example .env.local

# Linux/Mac
cp .env.example .env.local
```

Or manually create a `.env.local` file in the project root with the following content:

```env
# Supabase Database Configuration
# Use non-pooling connection (port 5432) for Prisma migrations
DATABASE_URL="postgres://postgres.tesmpdjsmjnpcirsenxk:mnvM4stFZXoVtOOY@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require"

# Supabase PostgreSQL Connection Strings
POSTGRES_URL="postgres://postgres.tesmpdjsmjnpcirsenxk:mnvM4stFZXoVtOOY@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x"
POSTGRES_USER="postgres"
POSTGRES_HOST="db.tesmpdjsmjnpcirsenxk.supabase.co"
POSTGRES_PASSWORD="mnvM4stFZXoVtOOY"
POSTGRES_DATABASE="postgres"

# Prisma URL (with pgbouncer for connection pooling)
POSTGRES_PRISMA_URL="postgres://postgres.tesmpdjsmjnpcirsenxk:mnvM4stFZXoVtOOY@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"

# Non-pooling connection (required for Prisma migrations)
POSTGRES_URL_NON_POOLING="postgres://postgres.tesmpdjsmjnpcirsenxk:mnvM4stFZXoVtOOY@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require"

# Supabase API Configuration
SUPABASE_URL="https://tesmpdjsmjnpcirsenxk.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc21wZGpzbWpucGNpcnNlbnhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NjcyNjUsImV4cCI6MjA3ODE0MzI2NX0.HpRxUu41Ywqv6HoH-_XQLQ1lSHjD05oBLvZzjRHY2kw"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc21wZGpzbWpucGNpcnNlbnhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjU2NzI2NSwiZXhwIjoyMDc4MTQzMjY1fQ.DkKo1VYtCfOzCeT36SODsqrkNywmykltcK6v9KF3q3U"
SUPABASE_JWT_SECRET="3nEahTVRHDlYbnrwWI5WGXJPnGsObIfDBNvPIsgHKHxXlQm60Zsmbmx8QKO5vhvl4BCBSOtvbcZMdqvbiY1KPA=="

# Next.js Public Supabase Variables (accessible in browser)
NEXT_PUBLIC_SUPABASE_URL="https://tesmpdjsmjnpcirsenxk.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc21wZGpzbWpucGNpcnNlbnhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NjcyNjUsImV4cCI6MjA3ODE0MzI2NX0.HpRxUu41Ywqv6HoH-_XQLQ1lSHjD05oBLvZzjRHY2kw"

# JWT Secret
JWT_SECRET="3nEahTVRHDlYbnrwWI5WGXJPnGsObIfDBNvPIsgHKHxXlQm60Zsmbmx8QKO5vhvl4BCBSOtvbcZMdqvbiY1KPA=="
```

## 🔑 Important Notes About Connection Strings

### For Prisma Migrations
- **Use port 5432** (non-pooling connection) - This is required for migrations
- Example: `postgres://...@...supabase.com:5432/postgres?sslmode=require`

### For Runtime Queries
- **Use port 6543** (pooling connection with pgbouncer) - Better for production
- Example: `postgres://...@...supabase.com:6543/postgres?sslmode=require&pgbouncer=true`

The `DATABASE_URL` in your `.env.local` should use the **non-pooling connection (port 5432)** for migrations to work correctly.

## 📦 Step 2: Generate Prisma Client

After setting up the environment variables, generate the Prisma Client:

```bash
npm run db:generate
```

Or directly:
```bash
npx prisma generate
```

## 🗄️ Step 3: Push Schema to Supabase

Push your Prisma schema to the Supabase database:

```bash
npm run db:push
```

This will create all the tables defined in your `prisma/schema.prisma` file.

**Alternative: Create a Migration**

If you prefer to use migrations:

```bash
npm run db:migrate
```

This will create a migration file and apply it to your database.

## ✅ Step 4: Verify Connection

Open Prisma Studio to verify your database connection:

```bash
npm run db:studio
```

This will open a browser window where you can view and manage your database tables.

## 🚀 Step 5: Start Development Server

Start your Next.js development server:

```bash
npm run dev
```

## 🔍 Troubleshooting

### Connection Errors

If you encounter connection errors:

1. **Check your connection string format** - Make sure it matches the Supabase format exactly
2. **Verify SSL mode** - Supabase requires `sslmode=require`
3. **Check port numbers** - Use 5432 for migrations, 6543 for runtime (with pgbouncer)
4. **Verify credentials** - Double-check your username, password, and database name

### Migration Issues

If migrations fail:

1. **Use non-pooling connection** - Make sure `DATABASE_URL` uses port 5432 (not 6543)
2. **Check database permissions** - Ensure your user has CREATE TABLE permissions
3. **Verify SSL** - Make sure `sslmode=require` is in the connection string

### Common Errors

#### Error: "P1001: Can't reach database server"
- **Solution**: Check your Supabase project status and connection string

#### Error: "P1000: Authentication failed"
- **Solution**: Verify your database password and username

#### Error: "Migration failed"
- **Solution**: Use the non-pooling connection (port 5432) for migrations

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Prisma + Supabase Guide](https://supabase.com/docs/guides/integrations/prisma)

## 🎉 Success!

Your application is now configured to use Supabase with Prisma! All database operations will use Prisma Client for type-safe database access.

