# UPC Conflict Resolver V2

> **Enterprise-grade UPC conflict detection and resolution platform**
> Built with Next.js 14, Express, PostgreSQL, and TypeScript

---

## 🎯 Overview

A modern, data-focused dashboard for detecting, analyzing, and resolving UPC (Universal Product Code) conflicts across large datasets. Designed for enterprise warehouse management, inventory control, and supply chain operations.

### Key Features

- 📊 **Data-Focused Dashboard** - Analytics-heavy interface with advanced visualizations
- 🔐 **Enterprise Authentication** - JWT-based auth with role-based access control
- ⚡ **High Performance** - Handles millions of rows with efficient processing
- 🤖 **AI-Powered** - Machine learning for conflict resolution suggestions
- 📈 **Real-Time Analytics** - Live updates and comprehensive reporting
- 🏢 **Multi-Tenant** - Organization-based data isolation

---

## 🏗️ Architecture

### Frontend
- **Next.js 14** with App Router (React Server Components)
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **Recharts** for data visualization
- **Zustand** for state management

### Backend
- **Express** with TypeScript
- **PostgreSQL** database
- **Prisma ORM** for database access
- **JWT** authentication
- **Multer** for file uploads
- **csv-parser** & **xlsx** for file processing

### Infrastructure
- **Docker** for containerization
- **Vercel** for frontend deployment (ready)
- **Railway/Render** for backend deployment (ready)

---

## 📦 Project Structure

```
UPC_Mismatch/
├── client-v2/                 # Next.js 14 Frontend
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   ├── components/       # React components
│   │   ├── lib/              # Utilities
│   │   └── types/            # TypeScript types
│   └── package.json
│
├── server-v2/                # Express Backend
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth, validation
│   │   └── index.ts         # Entry point
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   └── package.json
│
├── QUICKSTART.md            # Get started in 5 minutes
├── SESSION_1_REBUILD_GUIDE.md  # Detailed architecture docs
└── README_V2.md             # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm/yarn

### Installation

```bash
# 1. Install frontend dependencies
cd client-v2 && npm install

# 2. Install backend dependencies
cd ../server-v2 && npm install

# 3. Set up database
docker run --name upc-postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres

# 4. Configure environment (copy .env.example files)
cp server-v2/.env.example server-v2/.env
# Edit server-v2/.env with your database URL and JWT secret

# 5. Run migrations
cd server-v2 && npx prisma migrate dev

# 6. Start development servers
# Terminal 1:
cd server-v2 && npm run dev

# Terminal 2:
cd client-v2 && npm run dev
```

Visit: **http://localhost:3000**

📖 **For detailed setup instructions**, see [QUICKSTART.md](./QUICKSTART.md)

---

## 📊 Features by Session

### ✅ Session 1: Core Architecture + Auth (COMPLETE)
- Modern Next.js 14 setup with App Router
- Express backend with TypeScript
- PostgreSQL database with Prisma
- JWT authentication system
- User registration and login
- Protected dashboard routes
- Professional UI foundation

### 🔄 Session 2: File Upload + Processing (NEXT)
- Drag-and-drop file upload
- CSV/XLSX parsing
- Data validation and preview
- Batch processing queue
- Progress tracking

### 🔄 Session 3: Conflict Management (PLANNED)
- Conflict detection algorithms
- Advanced filtering and search
- Bulk operations
- Conflict resolution workflow
- Assignment system

### 🔄 Session 4: Analytics + Reporting (PLANNED)
- Interactive charts and graphs
- Custom reports
- Export functionality
- Trend analysis
- Performance metrics

### 🔄 Session 5: Polish + Deploy (PLANNED)
- Production optimization
- Security hardening
- CI/CD pipeline
- Monitoring and logging
- Final deployment

---

## 🔐 Security

- **Password Hashing**: bcrypt with 12 rounds
- **JWT Tokens**: 7-day expiry, HTTP-only cookies
- **CORS**: Configurable origins
- **Input Validation**: express-validator
- **SQL Injection**: Prisma parameterized queries
- **XSS Protection**: React automatic escaping

---

## 🗄️ Database Schema

### Core Models
- **User** - Authentication and profiles
- **Organization** - Multi-tenant isolation
- **Analysis** - File upload records
- **Conflict** - Detected UPC conflicts

### Enumerations
- `UserRole`: ADMIN, USER, ANALYST
- `ConflictType`: DUPLICATE_UPC, INVALID_FORMAT, etc.
- `Severity`: LOW, MEDIUM, HIGH, CRITICAL
- `AnalysisStatus`: PENDING, PROCESSING, COMPLETED, FAILED

---

## 🛠️ Development

### Commands

**Frontend:**
```bash
cd client-v2
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint
```

**Backend:**
```bash
cd server-v2
npm run dev           # Development server with hot reload
npm run build         # Compile TypeScript
npm run start         # Production server
npx prisma studio     # Database GUI
npx prisma migrate dev # Run migrations
```

### Environment Variables

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Backend (.env):**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/db"
JWT_SECRET="your-secret-key"
PORT=5000
NODE_ENV=development
```

---

## 📝 API Documentation

### Authentication
```
POST /api/auth/register    # Create account
POST /api/auth/login       # Sign in
GET  /api/auth/me          # Get profile (auth required)
```

### Analysis
```
GET  /api/analysis         # List all analyses
GET  /api/analysis/:id     # Get single analysis
POST /api/analysis/upload  # Upload file for processing
```

### Conflicts
```
GET   /api/conflicts       # List conflicts with filtering
GET   /api/conflicts/:id   # Get single conflict
PATCH /api/conflicts/:id   # Update conflict status
```

---

## 🚢 Deployment

### Frontend (Vercel)
```bash
cd client-v2
vercel deploy --prod
```

### Backend (Railway/Render)
```bash
cd server-v2
# Push to GitHub, connect to Railway/Render
# Set environment variables in dashboard
```

### Database (Supabase/Neon)
- Create PostgreSQL instance
- Update DATABASE_URL
- Run migrations: `npx prisma migrate deploy`

---

## 🧪 Testing

```bash
# Backend
cd server-v2
npm test

# Frontend
cd client-v2
npm test
```

---

## 🤝 Contributing

This is a phased rebuild project. Each session adds new features:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

Proprietary - All rights reserved

---

## 🆘 Support

- **Documentation**: See [QUICKSTART.md](./QUICKSTART.md) and [SESSION_1_REBUILD_GUIDE.md](./SESSION_1_REBUILD_GUIDE.md)
- **Issues**: Open an issue on GitHub
- **Questions**: Contact the development team

---

## 📈 Roadmap

- [x] Session 1: Core Architecture + Auth
- [ ] Session 2: File Upload + Processing
- [ ] Session 3: Conflict Management
- [ ] Session 4: Analytics + Reporting
- [ ] Session 5: Polish + Deploy

---

## 🎉 Acknowledgments

Built with modern best practices and enterprise-grade architecture.

**Tech Stack:**
- Next.js 14
- React 18
- TypeScript 5
- Express 4
- PostgreSQL 16
- Prisma 5
- Tailwind CSS 3

---

**Current Status: Session 1 Complete ✅**

Ready to begin Session 2! 🚀

