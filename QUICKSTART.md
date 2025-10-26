# 🚀 Quick Start Guide - Session 1 Complete!

## ✅ What's Been Built

You now have a **modern, production-ready foundation** with:

- ✨ **Next.js 14 App Router** frontend with TypeScript
- 🎨 **Tailwind CSS** with dark mode
- 🔐 **JWT Authentication** (register, login, protected routes)
- 🗄️ **PostgreSQL database** with Prisma ORM
- ⚡ **Express backend** with TypeScript
- 📊 **Professional UI** ready for data dashboards

---

## 📋 Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download/) or use Docker)
- **npm** or **yarn**

---

## 🛠️ Setup Instructions

### Step 1: Install PostgreSQL

**Option A - Using Docker (Recommended):**
```bash
docker run --name upc-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=upc_resolver \
  -p 5432:5432 \
  -d postgres:16
```

**Option B - Native Installation:**
- Download and install PostgreSQL
- Create a database named `upc_resolver`

### Step 2: Install Frontend Dependencies

```bash
cd client-v2
npm install
```

### Step 3: Install Backend Dependencies

```bash
cd ../server-v2
npm install
```

### Step 4: Configure Environment Variables

**Create `server-v2/.env`:**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/upc_resolver"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
PORT=5000
NODE_ENV=development
CORS_ORIGINS="http://localhost:3000"
```

**Create `client-v2/.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Step 5: Set Up Database

```bash
cd server-v2

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

### Step 6: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd server-v2
npm run dev
```

You should see:
```
🚀 Server running on port 5000
📊 Environment: development
🔗 API: http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd client-v2
npm run dev
```

Visit: **http://localhost:3000**

---

## 🎯 Test the Application

### 1. Home Page
- Visit http://localhost:3000
- Should see modern landing page

### 2. Register an Account
- Click "Get Started" or go to http://localhost:3000/register
- Fill in:
  - Name: Your Name
  - Email: test@example.com
  - Organization: Test Company
  - Password: password123
- Click "Create Account"

### 3. View Dashboard
- After registration, you'll be redirected to the dashboard
- You should see your welcome message and stats (all zeros for now)

### 4. Test Logout/Login
- Click "Logout"
- Go to http://localhost:3000/login
- Sign in with your credentials

---

## 📁 Project Structure

```
client-v2/                      # Next.js Frontend
├── src/
│   ├── app/
│   │   ├── (auth)/            # Auth pages (login, register)
│   │   ├── (dashboard)/       # Protected dashboard pages
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── globals.css        # Global styles
│   └── ...
└── package.json

server-v2/                      # Express Backend
├── src/
│   ├── controllers/           # Business logic
│   │   └── authController.ts
│   ├── routes/               # API routes
│   │   ├── auth.ts
│   │   ├── analysis.ts
│   │   └── conflicts.ts
│   ├── middleware/           # Auth middleware
│   │   └── auth.ts
│   └── index.ts              # Server entry point
├── prisma/
│   └── schema.prisma         # Database schema
└── package.json
```

---

## 🔍 API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Get user profile (requires auth)

### Analysis (Placeholder - Session 2)
- `GET /api/analysis` - List analyses
- `POST /api/analysis/upload` - Upload file

### Conflicts (Placeholder - Session 2)
- `GET /api/conflicts` - List conflicts
- `PATCH /api/conflicts/:id` - Update conflict

---

## 🎨 Database Schema

The Prisma schema includes:

- **User** - User accounts with authentication
- **Organization** - Multi-tenant organizations
- **Analysis** - File upload and processing records
- **Conflict** - UPC conflicts detected

Relations:
- Users belong to Organizations
- Analyses belong to Users and Organizations
- Conflicts belong to Analyses

---

## 🐛 Troubleshooting

### "Can't connect to database"
```bash
# Check if PostgreSQL is running
docker ps  # if using Docker

# Test connection
psql postgresql://postgres:password@localhost:5432/upc_resolver
```

### "Port 3000 already in use"
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
PORT=3001 npm run dev
```

### "Module not found" errors
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Prisma client errors
```bash
# Regenerate Prisma client
npx prisma generate

# Reset database
npx prisma migrate reset
```

---

## 📝 What's Next?

### Session 2 Will Add:
1. **File Upload**
   - Drag-and-drop interface
   - Multi-file support
   - Progress tracking

2. **CSV/XLSX Processing**
   - File parsing and validation
   - Column mapping
   - Data preview

3. **Conflict Detection**
   - UPC validation algorithms
   - Duplicate detection
   - Mismatch identification

4. **Data Visualization**
   - Charts and graphs
   - Analytics dashboard
   - Real-time updates

---

## 💡 Tips

- **Database GUI**: Use `npx prisma studio` to view/edit database
- **API Testing**: Use Postman or curl to test endpoints
- **Hot Reload**: Both frontend and backend support hot reload
- **Type Safety**: TypeScript provides autocomplete and type checking

---

## 🎉 Success Criteria

You're ready for Session 2 if you can:
- ✅ Register a new account
- ✅ Log in successfully
- ✅ See the dashboard
- ✅ Logout and log back in
- ✅ Backend API responds at http://localhost:5000/health

---

## 📚 Learn More

- [Next.js 14 Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Express Docs](https://expressjs.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Session 1: Core Architecture + Auth ✅ COMPLETE**

Ready for Session 2 when you are! 🚀

