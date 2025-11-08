# 🗄️ Database Setup Instructions

## Current Situation

Your database (`smart_fish_care.sql`) currently has:
- ✅ `sensor_data` table
- ✅ `users` table (basic version)

But your Next.js application needs additional tables for:
- Email verification
- Records management (stocking, harvest, feeding)
- Fish detection
- System logging

## 📋 Setup Steps

### Option 1: Quick Setup (Recommended)

1. **Import the complete migration SQL:**
   ```sql
   -- Open phpMyAdmin or MySQL command line
   -- Select your `smart_fish_care` database
   -- Run the SQL file: database/complete_migration.sql
   ```

   Or via command line:
   ```bash
   mysql -u root -p smart_fish_care < database/complete_migration.sql
   ```

2. **Regenerate Prisma Client:**
   ```bash
   npm run db:generate
   ```

3. **Verify setup:**
   ```bash
   npm run db:studio
   ```
   This opens Prisma Studio where you can see all tables.

### Option 2: Manual Setup (If Option 1 Fails)

If `IF NOT EXISTS` or `ADD COLUMN IF NOT EXISTS` doesn't work (older MySQL versions), run these in order:

1. **Add email verification fields to users:**
   ```sql
   ALTER TABLE `users` 
   ADD COLUMN `email_verified` TINYINT(1) NOT NULL DEFAULT 0,
   ADD COLUMN `verification_token` VARCHAR(255) DEFAULT NULL,
   ADD COLUMN `verification_expires` TIMESTAMP NULL DEFAULT NULL,
   ADD COLUMN `otp_code` VARCHAR(6) DEFAULT NULL,
   ADD COLUMN `otp_expires` TIMESTAMP NULL DEFAULT NULL;
   ```

2. **Import from original files:**
   - Run `smartfish-copy/database/email_verification_update.sql`
   - Run `smartfish-copy/database/records_tables.sql`
   - Run `smartfish-copy/database/fish_detection_table.sql`

## ✅ Verification

After running the migration, verify your database has these tables:

1. ✅ `users` (with email verification fields)
2. ✅ `sensor_data`
3. ✅ `email_verification_logs`
4. ✅ `fish_size_ranges`
5. ✅ `water_parameters`
6. ✅ `stocking_records`
7. ✅ `harvest_records`
8. ✅ `feeding_records`
9. ✅ `fish_detections`
10. ✅ `system_logs`

## 🔍 Check Database Structure

Run this SQL to see all your tables:
```sql
SHOW TABLES;
```

To check if users table has email verification fields:
```sql
DESCRIBE users;
```

You should see:
- `email_verified`
- `verification_token`
- `verification_expires`
- `otp_code`
- `otp_expires`

## 🚨 Common Issues

### Issue: "Column already exists"
**Solution:** The column was already added. Skip that ALTER TABLE command.

### Issue: "Table already exists"
**Solution:** The table was already created. Skip that CREATE TABLE command.

### Issue: Foreign key constraint fails
**Solution:** Make sure the `users` table exists first, then create dependent tables.

## 📝 After Migration

Once the database is updated:

1. ✅ Regenerate Prisma Client: `npm run db:generate`
2. ✅ Restart your dev server: `npm run dev`
3. ✅ Test sign-up flow (should work with email verification)

---

**Need help?** Check `DATABASE_ANALYSIS.md` for detailed analysis of your current schema.

