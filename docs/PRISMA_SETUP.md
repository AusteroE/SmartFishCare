# 🗄️ Prisma Setup Guide

This project uses **Prisma ORM** for type-safe database access with MySQL.

## 📋 Prerequisites

- MySQL database running
- Node.js 18+ installed
- Database `smart_fish_care` exists

## 🚀 Setup Instructions

### 1. Configure Database Connection

Add the `DATABASE_URL` to your `.env.local` file:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
```

Example:
```env
DATABASE_URL="mysql://root:password@localhost:3306/smart_fish_care"
```

If your MySQL has no password:
```env
DATABASE_URL="mysql://root:@localhost:3306/smart_fish_care"
```

### 2. Generate Prisma Client

After setting up the `DATABASE_URL`, generate the Prisma Client:

```bash
npm run db:generate
```

Or directly:
```bash
npx prisma generate
```

### 3. (Optional) Push Schema to Database

If you want Prisma to sync your schema with the database:

```bash
npm run db:push
```

**Note**: If your database already has the schema (from the PHP version), you can skip this step.

### 4. Start Development

```bash
npm run dev
```

## 🛠️ Available Prisma Commands

- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema changes to database (no migration)
- `npm run db:migrate` - Create and apply migrations
- `npm run db:studio` - Open Prisma Studio (database GUI)

## 📁 Prisma Files

- `prisma/schema.prisma` - Database schema definition
- `src/lib/db.ts` - Prisma Client instance

## 🔧 Usage in Code

### Import Prisma Client

```typescript
import { prisma } from '@/lib/db';
```

### Example Queries

```typescript
// Find user
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
});

// Create user
const newUser = await prisma.user.create({
  data: {
    username: 'john',
    email: 'john@example.com',
    password: hashedPassword,
  },
});

// Update user
await prisma.user.update({
  where: { id: userId },
  data: { emailVerified: true },
});

// Find with relations
const userWithRecords = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    stockingRecords: true,
    harvestRecords: true,
  },
});
```

## 🗃️ Database Models

The following models are defined in `prisma/schema.prisma`:

- **User** - User accounts and authentication
- **SensorData** - IoT sensor readings (pH, temperature)
- **FishSizeRange** - Fish size category definitions
- **WaterParameter** - Water quality parameter thresholds
- **StockingRecord** - Fish stocking records
- **HarvestRecord** - Fish harvest records
- **FeedingRecord** - Feeding schedule records
- **FishDetection** - AI fish detection results
- **EmailVerificationLog** - Email verification tracking
- **SystemLog** - System activity logs

## 🔄 Migration from mysql2

All database queries have been migrated from `mysql2` to Prisma:

- ✅ Type-safe queries
- ✅ Auto-completion in IDE
- ✅ Relation handling
- ✅ Connection pooling
- ✅ Query optimization

## 🐛 Troubleshooting

### "Missing required environment variable: DATABASE_URL"

Make sure `.env.local` exists with the `DATABASE_URL` set.

### "Can't reach database server"

1. Verify MySQL is running
2. Check connection string format
3. Ensure database exists
4. Verify credentials

### "Schema and database are out of sync"

Run `npm run db:push` to sync schema with database, or use migrations:
```bash
npm run db:migrate
```

### Prisma Client not generated

Run:
```bash
npm run db:generate
```

## 📚 Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma MySQL](https://www.prisma.io/docs/concepts/database-connectors/mysql)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)

## ✨ Benefits of Prisma

- ✅ **Type Safety** - Full TypeScript support
- ✅ **Auto-completion** - IDE support for queries
- ✅ **Relations** - Easy handling of database relationships
- ✅ **Migrations** - Version control for database changes
- ✅ **Prisma Studio** - Visual database browser
- ✅ **Performance** - Optimized query engine
- ✅ **Developer Experience** - Better than raw SQL

---

**Note**: The original `mysql2` dependency has been removed. All database operations now use Prisma.

