# Session 1: Core Architecture + Auth + Basic Backend

## 🎯 What We're Building

A modern, production-ready UPC Conflict Resolver with:
- **Frontend**: Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui
- **Backend**: Express + TypeScript + PostgreSQL + JWT Auth
- **Architecture**: Clean, scalable, data-focused dashboard

---

## 📁 Project Structure

```
UPC_Mismatch/
├── client-v2/                 # Next.js 14 App Router Frontend
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   │   ├── (auth)/       # Auth pages (login, register)
│   │   │   ├── (dashboard)/  # Protected dashboard pages
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/       # React components
│   │   │   ├── ui/          # shadcn/ui components
│   │   │   ├── layout/      # Layout components
│   │   │   └── dashboard/   # Dashboard-specific
│   │   ├── lib/             # Utilities
│   │   │   ├── api.ts       # API client
│   │   │   ├── auth.ts      # Auth helpers
│   │   │   └── utils.ts     # General utilities
│   │   └── types/           # TypeScript types
│   └── public/              # Static assets
│
└── server-v2/                # Express Backend
    ├── src/
    │   ├── routes/          # API routes
    │   ├── controllers/     # Route handlers
    │   ├── models/          # Database models
    │   ├── middleware/      # Auth, validation, etc
    │   ├── config/          # Configuration
    │   └── index.ts         # Entry point
    └── prisma/              # Database schema
```

---

## 🚀 Setup Instructions

### 1. Install Frontend Dependencies

```bash
cd client-v2
npm install
```

### 2. Install Backend Dependencies

```bash
cd ../server-v2
npm install
```

### 3. Set Up Database

```bash
# Install PostgreSQL (or use Docker)
docker run --name upc-postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres

# Run migrations
cd server-v2
npx prisma migrate dev
```

### 4. Environment Variables

**client-v2/.env.local**:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**server-v2/.env**:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/upc_resolver"
JWT_SECRET="your-super-secret-jwt-key-change-this"
PORT=5000
NODE_ENV=development
```

### 5. Run Development Servers

```bash
# Terminal 1 - Backend
cd server-v2
npm run dev

# Terminal 2 - Frontend
cd client-v2
npm run dev
```

Visit: http://localhost:3000

---

## 🏗️ What's Included

### ✅ Completed
- Project configuration (TypeScript, Tailwind, ESLint)
- Next.js 14 App Router setup
- Backend API structure
- Database schema
- Authentication system
- Core components

### 🔄 Next Steps (Session 2)
- File upload functionality
- CSV/Excel parsing
- UPC conflict detection
- File processing queue

---

## 📚 Key Technologies

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **UI**: shadcn/ui (Radix UI primitives)
- **State**: Zustand for global state
- **Charts**: Recharts for data visualization
- **Backend**: Express, TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT tokens + HTTP-only cookies

---

## 🎨 Design System

Using a **data-focused dashboard** approach:
- Dense information display
- Multiple chart types
- Advanced filtering
- Real-time updates
- Professional, enterprise-grade UI

---

## 📝 Notes

This is **Session 1** of a phased rebuild. The foundation is solid and ready for expansion.

Next session will add:
- File upload + drag-and-drop
- CSV/XLSX parsing
- Conflict detection algorithms
- Processing queue with status updates

