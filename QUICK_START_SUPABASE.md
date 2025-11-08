# ⚡ Quick Start: Supabase + Prisma

## ✅ Setup Complete!

Your application has been configured for Supabase. Follow these steps to get started:

## 🚀 Quick Setup Steps

### 1. Verify Environment File
The `.env.local` file has been created with your Supabase credentials. If you need to recreate it:

**Windows:**
```powershell
powershell -ExecutionPolicy Bypass -File setup-env.ps1
```

**Linux/Mac:**
```bash
cp .env.example .env.local
# Then edit .env.local with your credentials
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Generate Prisma Client
```bash
npm run db:generate
```

### 4. Push Schema to Database
```bash
npm run db:push
```

### 5. Start Development
```bash
npm run dev
```

## 🔍 Verify Connection

Open Prisma Studio to view your database:
```bash
npm run db:studio
```

## 📝 Important Notes

- **DATABASE_URL** uses non-pooling connection (port 5432) - required for migrations
- **POSTGRES_PRISMA_URL** uses pooling connection (port 6543) - available for future use
- All Supabase API keys and URLs are configured
- Prisma schema is already set to PostgreSQL ✅

## 🆘 Troubleshooting

### Connection Errors
- Verify your Supabase project is active
- Check that connection strings are correct
- Ensure `sslmode=require` is in the connection string

### Migration Issues
- Make sure `DATABASE_URL` uses port 5432 (non-pooling)
- Verify database credentials are correct
- Check Supabase project settings

## 📚 More Information

See `docs/SUPABASE_PRISMA_SETUP.md` for detailed documentation.

