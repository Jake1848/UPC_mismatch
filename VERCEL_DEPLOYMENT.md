# 🚀 Vercel Deployment Guide

## Quick Fix for Current Error

The error `The specified Root Directory "client" does not exist` happens because we renamed the directory to `client-v2`.

### Fix in Vercel Dashboard:

1. Go to your Vercel project settings: https://vercel.com/dashboard
2. Navigate to **Settings** → **General**
3. Scroll to **Root Directory**
4. Change from `client` to `client-v2`
5. Click **Save**
6. Go to **Deployments** tab
7. Click **Redeploy** on the latest deployment

---

## Complete Vercel Setup

### Project Settings

**Root Directory:** `client-v2`

**Framework Preset:** Next.js

**Build Command:** `npm run build`

**Output Directory:** `.next`

**Install Command:** `npm install`

### Environment Variables

Add these in **Settings** → **Environment Variables**:

```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

(You'll get the backend URL after deploying to Railway - see below)

---

## Backend Deployment (Railway)

### 1. Deploy Backend First

```bash
cd server-v2

# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Add environment variables
railway variables set DATABASE_URL="your-postgres-url"
railway variables set JWT_SECRET="your-super-secret-key-change-this"
railway variables set PORT=5000
railway variables set NODE_ENV=production
railway variables set CORS_ORIGINS="https://your-vercel-app.vercel.app"

# Deploy
railway up
```

### 2. Add PostgreSQL Database in Railway

1. In Railway dashboard, click **New** → **Database** → **PostgreSQL**
2. Copy the connection string
3. Update the `DATABASE_URL` variable
4. Run migrations:
   ```bash
   railway run npx prisma migrate deploy
   ```

### 3. Get Your Backend URL

- Railway will provide a URL like: `https://your-app.up.railway.app`
- Copy this URL

---

## Update Frontend with Backend URL

### Option 1: Vercel Dashboard

1. Go to Vercel project **Settings** → **Environment Variables**
2. Add: `NEXT_PUBLIC_API_URL` = `https://your-app.up.railway.app`
3. Redeploy

### Option 2: Update and Push

```bash
cd client-v2
echo "NEXT_PUBLIC_API_URL=https://your-app.up.railway.app" > .env.production

git add .
git commit -m "Add production API URL"
git push origin main
```

---

## Alternative: Deploy Both on Same Platform

### Option A: Vercel (Frontend + Serverless Backend)

**Not recommended** - Vercel serverless functions have limitations for file processing.

### Option B: Railway (Both Frontend + Backend)

```bash
# In project root
railway init

# Deploy backend
cd server-v2
railway up

# Deploy frontend
cd ../client-v2
railway up
```

### Option C: Render (Both Frontend + Backend)

1. Create account at render.com
2. New **Web Service** for backend (server-v2)
3. New **Static Site** for frontend (client-v2)
4. Set build command: `npm run build`
5. Add environment variables

---

## Recommended Architecture

```
Frontend (Vercel)
    ↓ API calls
Backend (Railway)
    ↓ Database
PostgreSQL (Railway)
```

**Why?**
- ✅ Vercel: Best for Next.js, global CDN, automatic previews
- ✅ Railway: Great for Node.js backends, easy database setup
- ✅ Separation of concerns, independent scaling

---

## Complete Deployment Checklist

### Backend (Railway)

- [ ] Create Railway account
- [ ] Deploy server-v2
- [ ] Add PostgreSQL database
- [ ] Set environment variables:
  - [ ] DATABASE_URL
  - [ ] JWT_SECRET
  - [ ] PORT=5000
  - [ ] NODE_ENV=production
  - [ ] CORS_ORIGINS
- [ ] Run database migrations
- [ ] Test API endpoints (GET /health)
- [ ] Copy backend URL

### Frontend (Vercel)

- [ ] Update Root Directory to `client-v2`
- [ ] Set environment variable:
  - [ ] NEXT_PUBLIC_API_URL
- [ ] Redeploy
- [ ] Test login/register
- [ ] Test file upload
- [ ] Verify conflicts detection

### Update Backend CORS

After Vercel deployment, update backend CORS_ORIGINS:

```bash
railway variables set CORS_ORIGINS="https://your-app.vercel.app,https://your-app-git-main.vercel.app,https://your-app-preview.vercel.app"
```

---

## Environment Variables Reference

### Backend (.env)

```env
DATABASE_URL="postgresql://user:password@host:5432/database"
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
PORT=5000
NODE_ENV=production
CORS_ORIGINS="https://your-app.vercel.app"
```

### Frontend (.env.production)

```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

---

## Testing Your Deployment

### 1. Test Backend

```bash
# Health check
curl https://your-backend.railway.app/api/health

# Should return: {"status":"ok"}
```

### 2. Test Frontend

1. Visit your Vercel URL
2. Click "Get Started"
3. Register a new account
4. Upload a CSV file
5. View conflicts

---

## Troubleshooting

### Issue: CORS Errors

**Solution:** Add your Vercel URL to backend CORS_ORIGINS:
```bash
railway variables set CORS_ORIGINS="https://your-app.vercel.app"
railway up
```

### Issue: Database Connection Failed

**Solution:** Check DATABASE_URL is set correctly:
```bash
railway variables
```

### Issue: 404 on API Routes

**Solution:** Verify NEXT_PUBLIC_API_URL is set and includes `/api`:
```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

### Issue: Build Fails

**Solution:** Check build logs, verify all dependencies are in package.json

---

## Production Checklist

Before going live:

- [ ] Change JWT_SECRET to strong random string (min 32 characters)
- [ ] Update CORS to only allow your domain
- [ ] Set up database backups
- [ ] Add monitoring (Sentry, LogRocket)
- [ ] Test all features thoroughly
- [ ] Set up custom domain
- [ ] Enable HTTPS (automatic on Vercel/Railway)
- [ ] Add rate limiting
- [ ] Set up error tracking

---

## Cost Estimate

**Free Tier (Development):**
- Vercel: Free (Hobby plan)
- Railway: $5/month (500 hours free, then pay-as-you-go)
- Total: ~$5/month

**Production (Scaled):**
- Vercel Pro: $20/month
- Railway: $20-50/month
- Total: ~$40-70/month

---

## Next Steps

1. **Fix Current Error:** Change Root Directory to `client-v2` in Vercel
2. **Deploy Backend:** Set up Railway with PostgreSQL
3. **Update Frontend:** Add backend URL to environment variables
4. **Test Everything:** Register, upload, view conflicts
5. **Add Custom Domain:** In Vercel settings (optional)

---

**Need Help?**

- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- Project Issues: https://github.com/Jake1848/UPC_mismatch/issues

---

**Current Status:** Ready to deploy! Just update the Root Directory setting.

