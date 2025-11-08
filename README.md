# 🐟 Smart Fish Care - Next.js Edition

A modern aquaculture management system built with Next.js, TypeScript, and React.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- MySQL database running
- Gmail account for email service (optional)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```
   Then edit `.env.local` with your database and email credentials.

3. **Set up database:**
   - Ensure MySQL is running
   - Create database `smart_fish_care` (or use existing)
   - Import schema from `smartfish-copy/database/smart_fish_care.sql`

4. **Set up IoT Python server (first time only):**
   ```bash
   cd IoT
   # Windows:
   setup_venv.bat
   # Linux/Mac:
   bash setup_venv.sh
   cd ..
   ```

5. **Start all services:**

   **Option 1: Using NPM (Recommended)**
   ```bash
   npm run dev:all
   ```
   This starts both Next.js and Python IoT server together.

   **Option 2: Using batch/shell scripts**
   ```bash
   # Windows:
   start_all.bat
   
   # Linux/Mac:
   bash start_all.sh
   ```

   **Option 3: Manual (separate terminals)**
   ```bash
   # Terminal 1: Next.js
   npm run dev
   
   # Terminal 2: Python IoT
   cd IoT
   # Windows:
   activate_venv.bat
   python server.py
   # Linux/Mac:
   source venv/bin/activate
   python server.py
   ```

6. **Open browser:**
   Navigate to `http://localhost:3000`

## ✨ Features

- ✅ User authentication (Sign up, Sign in, Email verification)
- ✅ JWT-based session management
- ✅ Real-time IoT sensor data monitoring
- ✅ Modern, responsive UI
- ✅ Dashboard with water quality tracking
- ✅ Profile management
- ✅ Secure API routes

## 📁 Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
└── lib/              # Utility libraries
```

## 📚 Documentation

- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Complete migration documentation from PHP to Next.js
- **[PRISMA_SETUP.md](./PRISMA_SETUP.md)** - Prisma ORM setup and usage guide
- **[Original PHP System](./smartfish-copy/)** - Reference to original PHP implementation

## 🔧 Configuration

### Environment Variables

Required variables in `.env.local`:

```env
DB_HOST=localhost
DB_NAME=smart_fish_care
DB_USER=root
DB_PASSWORD=

JWT_SECRET=your-secret-key

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=Smart Fish Care System

NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start Next.js development server only
- `npm run dev:all` - Start both Next.js and Python IoT server together
- `npm run start:all` - Start both servers in production mode
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Starting Services

**Quick Start (All Services):**
```bash
npm run dev:all
```

**Stop All Services:**
- Windows: Double-click `stop_all.bat`
- Or manually: Close both terminal windows

### Tech Stack

- **Framework**: Next.js 16
- **Language**: TypeScript
- **Styling**: CSS-in-JS, Tailwind CSS
- **Database**: MySQL (via Prisma ORM)
- **Authentication**: JWT
- **Email**: Nodemailer

## 📝 API Endpoints

### Authentication
- `POST /api/auth/sign-in` - User login
- `POST /api/auth/sign-up` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify-email?token=...` - Email verification
- `POST /api/auth/verify-otp` - OTP verification

### User
- `GET /api/user/me` - Get current user

### IoT Data
- `GET /api/iot-data` - Get latest sensor data
- `POST /api/iot-data` - Submit sensor data

## 🚧 Roadmap

- [ ] Admin dashboard
- [ ] Records management
- [ ] Alerts system
- [ ] Fish detection integration
- [ ] Advanced reporting

## 📄 License

This project is part of the Smart Fish Care system.

## 🤝 Contributing

This is a migration project. For issues or questions, refer to the original PHP system in `smartfish-copy/`.

---

**Built with ❤️ using Next.js**
