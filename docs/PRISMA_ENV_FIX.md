# Prisma Environment Variable Fix

## Issue
Prisma CLI commands (like `prisma studio`, `prisma db pull`, etc.) were not finding the `DATABASE_URL` environment variable, even though it was set in `.env.local`.

## Root Cause
Prisma CLI reads environment variables from `.env` files in this order:
1. `.env` (highest priority)
2. `.env.local` (only in some contexts, not always for CLI commands)

Next.js automatically loads `.env.local`, but Prisma CLI commands don't always read it.

## Solution
Created a minimal `.env` file containing only `DATABASE_URL` so Prisma CLI can access it.

## File Structure

```
.env              # Contains only DATABASE_URL (for Prisma CLI)
.env.local        # Contains all environment variables (for Next.js)
```

## Why Two Files?

- **`.env`**: Required by Prisma CLI commands (`prisma studio`, `prisma db pull`, `prisma migrate`, etc.)
- **`.env.local`**: Used by Next.js for the application runtime

## Important Notes

1. **Both files are in `.gitignore`** - They won't be committed to version control
2. **Keep them in sync** - If you update `DATABASE_URL` in `.env.local`, also update `.env`
3. **`.env.local` is the source of truth** - All other environment variables should be in `.env.local`
4. **`.env` only needs `DATABASE_URL`** - Don't add other variables to `.env`

## Updating DATABASE_URL

If you need to update the database URL:

1. Update `.env.local`:
   ```env
   DATABASE_URL="your-new-connection-string"
   ```

2. Update `.env`:
   ```env
   DATABASE_URL="your-new-connection-string"
   ```

3. Regenerate Prisma Client:
   ```bash
   npx prisma generate
   ```

## Verification

To verify Prisma can read the DATABASE_URL:

```bash
npx prisma db pull --print
```

If this command succeeds, Prisma is correctly reading the environment variable.

## Alternative Solutions (Not Recommended)

If you prefer to use only `.env.local`, you would need to:
- Use `dotenv-cli` package and prefix all Prisma commands
- Or manually set environment variables before running Prisma commands

The current solution (minimal `.env` file) is simpler and more reliable.

