# UPC Conflict Resolver 🚀

**Enterprise-grade SaaS solution for detecting and resolving UPC/SKU conflicts in warehouse management systems.**

*Transform your warehouse operations with intelligent UPC conflict detection and resolution workflows.*

## 💰 Pricing
- **Starter**: $599/month - Up to 100K products, 3 team members
- **Professional**: $1,299/month - Up to 1M products, 10 team members
- **Enterprise**: Custom pricing - Unlimited scale, dedicated support

## ✨ Features

### 🔍 Smart Detection
- **Intelligent Column Mapping**: Auto-detects UPC, SKU, and warehouse columns from any file format
- **Real-time Processing**: Handle up to 10M rows with streaming analysis
- **Multi-format Support**: CSV, Excel, TSV, JSON with automatic encoding detection

### 🛠️ Conflict Resolution
- **Automated Workflows**: Assign conflicts to team members with tracking
- **Resolution Proposals**: AI-powered suggestions for fixing conflicts
- **Audit Trail**: Complete history of all changes and resolutions

### 📊 Advanced Analytics
- **Trend Analysis**: Track conflicts over time with predictive insights
- **Vendor Scorecards**: Identify which suppliers cause the most issues
- **Cost Impact**: Calculate financial impact of each conflict
- **Custom Reports**: Build reports tailored to your business needs

### 🔗 Enterprise Integrations
- **WMS Connections**: Manhattan, Blue Yonder, SAP integration
- **ERP Systems**: NetSuite, Oracle, Dynamics support
- **Real-time Alerts**: Slack, Teams, email notifications
- **API Access**: Full REST API for custom integrations

### 👥 Team Collaboration
- **Multi-tenant Architecture**: Secure organization-level data isolation
- **Role-based Access**: Admin, analyst, and viewer permissions
- **Task Assignment**: Distribute conflict resolution across your team
- **Progress Tracking**: Monitor resolution status in real-time

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 7+

### Development Setup

1. **Clone and Setup**
   ```bash
   git clone https://github.com/company/upc-conflict-resolver
   cd upc-conflict-resolver
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start with Docker**
   ```bash
   docker-compose up -d
   ```

3. **Or Manual Setup**
   ```bash
   npm install
   npm run setup
   npm run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - API: http://localhost:5000
   - MinIO Console: http://localhost:9001 (minioadmin/minioadmin123)

### Production Deployment

#### Frontend (Vercel)
```bash
npm run build
vercel --prod
```

#### Backend (Railway)
```bash
railway login
railway up
```

## 📁 Project Structure

```
upc-conflict-resolver/
├── client/                 # Next.js frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Next.js pages and API routes
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client functions
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Helper functions
│   ├── public/             # Static assets
│   └── styles/             # Global styles and themes
├── server/                 # Express.js backend API
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic services
│   │   ├── models/         # Prisma database models
│   │   ├── workers/        # Background job processors
│   │   ├── middleware/     # Express middleware
│   │   └── utils/          # Server utilities
│   ├── prisma/             # Database schema and migrations
│   └── uploads/            # Temporary file storage
├── shared/                 # Shared TypeScript types
└── docs/                   # Documentation
```

## 🔧 Configuration

### Environment Variables
See `.env.example` for all configuration options:

- **Database**: PostgreSQL connection string
- **Authentication**: NextAuth configuration
- **File Storage**: AWS S3 or MinIO settings
- **Payments**: Stripe API keys
- **Monitoring**: Sentry, DataDog integration
- **Notifications**: Email, Slack, Teams webhooks

### Feature Flags
- `ENABLE_DEMO_MODE`: Show demo with sample data
- `ENABLE_ANALYTICS`: Track usage analytics
- `ENABLE_MONITORING`: Performance monitoring

## 🔐 Security

- **Encryption**: AES-256 at rest, TLS 1.3 in transit
- **Authentication**: NextAuth with OAuth and SSO support
- **Authorization**: Row-level security and RBAC
- **Compliance**: SOC 2 and GDPR ready
- **Audit Logging**: Complete activity trail

## 📈 Monitoring

### Health Checks
- **API**: `GET /health`
- **Database**: Connection pooling with automatic reconnection
- **Queue**: Background job monitoring
- **File Storage**: S3 connectivity verification

### Metrics
- Processing time per file
- Queue depth and processing rate
- API response times
- Error rates by endpoint
- User engagement analytics

## 🧪 Testing

```bash
# Run all tests
npm test

# Frontend tests
cd client && npm test

# Backend tests
cd server && npm test

# E2E tests
npm run test:e2e
```

## 📚 API Documentation

### Authentication
```bash
POST /api/auth/register
POST /api/auth/login
POST /api/auth/invite
```

### File Analysis
```bash
POST /api/analyses/upload
GET /api/analyses
GET /api/analyses/:id
DELETE /api/analyses/:id
```

### Conflict Management
```bash
GET /api/conflicts
PUT /api/conflicts/:id
POST /api/conflicts/:id/resolve
```

### Billing
```bash
POST /api/billing/subscribe
PUT /api/billing/plan
POST /api/billing/cancel
```

See `/docs/api.md` for complete API documentation.

## 🚨 Troubleshooting

### Common Issues

**File Upload Fails**
- Check file size limit (50MB max)
- Verify file format (Excel/CSV only)
- Ensure S3 bucket permissions

**Database Connection Errors**
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Run `npm run db:push` to sync schema

**Background Jobs Not Processing**
- Ensure Redis is accessible
- Check worker process is running
- Monitor queue depth in admin panel

### Performance Optimization

**Large File Processing**
- Enable streaming mode for 1M+ rows
- Increase worker memory allocation
- Use database connection pooling

**High Concurrency**
- Scale worker processes horizontally
- Implement Redis clustering
- Use CDN for static assets

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open pull request

## 📄 License

Proprietary software. All rights reserved.

## 📞 Support

- **Email**: support@upcresolver.com
- **Docs**: https://docs.upcresolver.com
- **Status**: https://status.upcresolver.com
- **Enterprise**: enterprise@upcresolver.com

---

**Built with 💜 by the UPC Conflict Resolver Team**

*Transforming warehouse operations, one conflict at a time.*