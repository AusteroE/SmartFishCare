# ⚡ Quick Prisma Setup

## 1. Add DATABASE_URL to .env.local

Create or update `.env.local` with:

```env
DATABASE_URL="mysql://root:@localhost:3306/smart_fish_care"
```

**Replace with your credentials:**
- If you have a password: `mysql://root:yourpassword@localhost:3306/smart_fish_care`
- Different host/port: `mysql://user:pass@host:port/database`

## 2. Generate Prisma Client

```bash
npm run db:generate
```

## 3. (Optional) Sync Schema

If your database already has tables from the PHP version, you can skip this.
If starting fresh:

```bash
npm run db:push
```

## 4. Start Development

```bash
npm run dev
```

## ✅ Done!

Prisma is now configured. All database queries use Prisma Client for type-safe access.

### Verify Setup

Open Prisma Studio to view your database:
```bash
npm run db:studio
```

---

**Note**: Make sure MySQL is running and the database `smart_fish_care` exists!

