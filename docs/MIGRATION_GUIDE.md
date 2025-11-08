# 🚀 Smart Fish Care - PHP to Next.js Migration Guide

This document describes the migration of the Smart Fish Care system from PHP to Next.js.

## 📋 Overview

The entire PHP-based aquaculture management system has been converted to a modern Next.js application with TypeScript, React, and server-side API routes.

## ✅ Completed Migrations

### 1. **Database Connection**
- ✅ Converted PHP MySQLi to **Prisma ORM** for type-safe database access
- ✅ Location: `src/lib/db.ts` and `prisma/schema.prisma`
- ✅ Full TypeScript type safety
- ✅ Connection pooling and optimization
- ✅ Environment variable configuration

### 2. **Authentication System**
- ✅ Sign In (`/api/auth/sign-in`)
- ✅ Sign Up (`/api/auth/sign-up`)
- ✅ Email Verification (`/api/auth/verify-email`)
- ✅ OTP Verification (`/api/auth/verify-otp`)
- ✅ Logout (`/api/auth/logout`)
- ✅ JWT-based session management
- ✅ Cookie-based authentication

### 3. **Frontend Pages**
- ✅ Home/Landing Page (`/`)
- ✅ OTP Verification Page (`/verify-otp`)
- ✅ User Dashboard (`/dashboard`)
- ✅ Modal Components (SignIn, SignUp, Terms)

### 4. **API Routes**
- ✅ User Management (`/api/user/me`)
- ✅ IoT Sensor Data (`/api/iot-data`)
- ✅ Authentication endpoints (all above)

### 5. **Core Libraries**
- ✅ Database utilities (`src/lib/db.ts`)
- ✅ Authentication utilities (`src/lib/auth.ts`)
- ✅ Email service (`src/lib/email.ts`)

## 📁 Project Structure

```
smartfish/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes
│   │   │   ├── auth/           # Authentication endpoints
│   │   │   └── user/           # User management
│   │   ├── dashboard/          # User dashboard
│   │   ├── verify-otp/         # OTP verification page
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   ├── components/             # React components
│   │   ├── SignInModal.tsx
│   │   ├── SignUpModal.tsx
│   │   └── TermsModal.tsx
│   └── lib/                    # Utility libraries
│       ├── auth.ts             # Auth helpers
│       ├── db.ts               # Database connection
│       └── email.ts            # Email service
├── public/                     # Static assets
│   ├── uploads/               # User uploads
│   └── [images]/              # Images
├── .env.local.example          # Environment variables template
└── package.json               # Dependencies
```

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env.local` file based on `.env.local.example`:

```env
# Database Configuration
DB_HOST=localhost
DB_NAME=smart_fish_care
DB_USER=root
DB_PASSWORD=

# JWT Secret (generate a secure random string)
JWT_SECRET=your-secret-key-change-this-in-production

# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=Smart Fish Care System

# Base URL for verification links
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Database Setup

Ensure your MySQL database `smart_fish_care` is running and accessible. The database schema from the original PHP system is compatible.

**Important**: Make sure the database includes all the required tables:
- `users` (with email verification fields)
- `sensor_data`
- `email_verification_logs` (if using email verification logging)
- Any other tables from the original system

### 4. Static Assets

Copy necessary images and assets from `smartfish-copy/src/frontend/img/` to `public/`:
- `smartfishcarelogo.png`
- `default profile.png`
- Other required images

### 5. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 🔄 Key Differences from PHP Version

### Authentication
- **PHP**: Session-based authentication
- **Next.js**: JWT tokens stored in HTTP-only cookies

### File Uploads
- **PHP**: Uses `$_FILES` and `move_uploaded_file()`
- **Next.js**: Uses `FormData` API and Node.js `fs` module
- Files stored in `public/uploads/profile_images/`

### Database Queries
- **PHP**: MySQLi with prepared statements
- **Next.js**: **Prisma ORM** with type-safe queries and auto-completion

### Routing
- **PHP**: File-based routing (`dashboard.php`)
- **Next.js**: App Router (`/dashboard/page.tsx`)

### State Management
- **PHP**: Server-side sessions
- **Next.js**: Client-side React state with server-side validation

## 🚧 Remaining Work

### High Priority
- [ ] Admin Dashboard (`/admin/dashboard`)
- [ ] Records Management (`/dashboard/records`)
- [ ] Alerts System (`/dashboard/alerts`)
- [ ] Fish Detection Integration
- [ ] Profile Edit Functionality

### Medium Priority
- [ ] Email service configuration testing
- [ ] File upload validation improvements
- [ ] Error handling and user feedback
- [ ] Loading states and UI polish

### Low Priority
- [ ] Dark mode toggle (CSS already supports it)
- [ ] Additional features from original system
- [ ] Performance optimizations
- [ ] SEO improvements

## 📝 API Endpoints

### Authentication
- `POST /api/auth/sign-in` - User login
- `POST /api/auth/sign-up` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify-email?token=...` - Email verification
- `POST /api/auth/verify-otp` - OTP verification

### User
- `GET /api/user/me` - Get current user data

### IoT Data
- `GET /api/iot-data` - Fetch latest sensor data
- `POST /api/iot-data` - Submit new sensor data

## 🔐 Security Considerations

1. **JWT Secret**: Use a strong, randomly generated secret in production
2. **Database Credentials**: Never commit `.env.local` to version control
3. **File Uploads**: Currently saves to `public/`, consider cloud storage for production
4. **Email Credentials**: Use App Passwords for Gmail, not account password
5. **HTTPS**: Use HTTPS in production for secure cookie transmission

## 🐛 Troubleshooting

### Database Connection Issues
- Verify MySQL is running
- Check database credentials in `.env.local`
- Ensure database `smart_fish_care` exists

### Email Not Sending
- Verify SMTP credentials in `.env.local`
- Check Gmail App Password is correct
- Review email service logs

### File Upload Issues
- Ensure `public/uploads/profile_images/` directory exists
- Check file permissions
- Verify file size limits

### Authentication Issues
- Clear browser cookies
- Verify JWT_SECRET is set
- Check API route logs

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [MySQL2 Documentation](https://github.com/sidorares/node-mysql2)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [React Hooks](https://react.dev/reference/react)

## 📞 Support

For issues related to:
- **Database**: Check connection string and MySQL status
- **Authentication**: Review JWT token generation and validation
- **Email**: Verify SMTP configuration and credentials
- **File Uploads**: Check file permissions and paths

## ✨ Next Steps

1. Test all authentication flows
2. Implement remaining dashboard features
3. Add fish detection integration
4. Set up production environment
5. Deploy to hosting platform (Vercel, etc.)

---

**Migration completed on**: 2025-01-27
**Original PHP System**: Located in `smartfish-copy/`
**New Next.js System**: Root directory of this project

