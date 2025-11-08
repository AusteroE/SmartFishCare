# PowerShell script to create .env.local file for Supabase

$envContent = @"
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

# JWT Secret (using Supabase JWT Secret)
JWT_SECRET="3nEahTVRHDlYbnrwWI5WGXJPnGsObIfDBNvPIsgHKHxXlQm60Zsmbmx8QKO5vhvl4BCBSOtvbcZMdqvbiY1KPA=="
"@

$envContent | Out-File -FilePath ".env.local" -Encoding utf8
Write-Host ".env.local file created successfully!" -ForegroundColor Green

