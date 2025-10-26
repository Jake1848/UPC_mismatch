# 🚂 Railway Backend Deployment Guide

## Quick Deploy to Railway

### Prerequisites
- GitHub repository (✅ Already set up)
- Railway account (Sign up at https://railway.app)

---

## Step 1: Create Railway Project

### Option A: Deploy via Railway Dashboard (Recommended)

1. **Go to Railway Dashboard**
   - Visit https://railway.app/dashboard
   - Click **"New Project"**

2. **Deploy from GitHub**
   - Click **"Deploy from GitHub repo"**
   - Select your repository: `Jake1848/UPC_mismatch`
   - Railway will detect the project automatically

3. **Configure Root Directory**
   - Railway should auto-detect `server-v2` directory
   - If not, set **Root Directory** to `server-v2`

### Option B: Deploy via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project (from server-v2 directory)
cd server-v2
railway init

# Deploy
railway up
```

---

## Step 2: Add PostgreSQL Database

1. **In Railway Dashboard**
   - Click **"New"** button
   - Select **"Database"** → **"PostgreSQL"**
   - Railway will automatically create the database

2. **Get Database URL**
   - Click on the PostgreSQL service
   - Go to **"Variables"** tab
   - Copy the `DATABASE_URL` value

---

## Step 3: Configure Environment Variables

In Railway Dashboard, go to your backend service → **Variables** tab:

### Required Variables:

```bash
# Database (automatically provided by Railway if you added PostgreSQL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-change-this

# Server Config
PORT=5000
NODE_ENV=production

# CORS Origins (your Vercel frontend URL)
CORS_ORIGINS=https://your-vercel-app.vercel.app,https://your-vercel-app-git-main.vercel.app
```

### How to Set Variables:

1. Click **"New Variable"**
2. Enter variable name and value
3. Click **"Add"**
4. Repeat for all variables

**Important:** Replace `your-vercel-app.vercel.app` with your actual Vercel URL!

---

## Step 4: Deploy and Run Migrations

### Automatic Deployment

Railway will automatically:
1. Install dependencies
2. Generate Prisma client (`npm run build`)
3. Run migrations (`npm run prisma:migrate:deploy`)
4. Start the server (`npm start`)

### Check Deployment Logs

1. Click on your backend service
2. Go to **"Deployments"** tab
3. Click on the latest deployment
4. View logs to ensure everything started correctly

You should see:
```
🚀 UPC RESOLVER SERVER V2 - STARTING
✅ SERVER READY AND LISTENING!
🌐 URL: http://localhost:5000
```

---

## Step 5: Get Your Backend URL

1. In Railway Dashboard, click on your backend service
2. Go to **"Settings"** tab
3. Scroll to **"Domains"**
4. Click **"Generate Domain"**
5. Copy the generated URL (e.g., `https://your-app.up.railway.app`)

---

## Step 6: Update Frontend Environment Variables

### Update Vercel Environment Variables

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add or update:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
   ```
5. Click **"Save"**
6. Go to **"Deployments"** → **"Redeploy"** the latest deployment

### Update Backend CORS

1. Go back to Railway Dashboard
2. Click on your backend service
3. Go to **"Variables"** tab
4. Update `CORS_ORIGINS` to include your Vercel URL:
   ```
   CORS_ORIGINS=https://your-vercel-app.vercel.app,https://your-vercel-app-git-main-yourname.vercel.app
   ```
5. Railway will automatically redeploy

---

## Step 7: Test Your Deployment

### Test Backend Health Endpoint

```bash
curl https://your-backend.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-26T...",
  "uptime": 123,
  "environment": "production",
  "database": "configured",
  "version": "2.0.0"
}
```

### Test Frontend Connection

1. Visit your Vercel URL
2. Click **"Get Started"** or **"Login"**
3. Try to register a new account
4. If successful, you should see a dashboard

---

## Troubleshooting

### Issue: Database Connection Failed

**Check:**
```bash
# In Railway, verify DATABASE_URL is set correctly
echo $DATABASE_URL
```

**Solution:** Make sure PostgreSQL database is added and `DATABASE_URL` variable is set

### Issue: CORS Errors

**Error in browser console:**
```
Access to fetch at 'https://backend.railway.app/api/auth/login'
from origin 'https://frontend.vercel.app' has been blocked by CORS
```

**Solution:** Update `CORS_ORIGINS` in Railway to include your Vercel URL

### Issue: 502 Bad Gateway

**Check Railway logs:**
1. Click on backend service
2. Go to **"Deployments"**
3. Click latest deployment
4. Check logs for errors

**Common causes:**
- Database migrations failed
- Environment variables missing
- Build failed

### Issue: Migrations Not Running

**Manually run migrations:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run npm run prisma:migrate:deploy
```

---

## Environment Variables Reference

### Backend (.env on Railway)

```env
# Database (provided by Railway PostgreSQL)
DATABASE_URL="postgresql://user:password@host:port/database"

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"

# Server
PORT=5000
NODE_ENV=production

# CORS (your Vercel URLs)
CORS_ORIGINS="https://your-app.vercel.app,https://your-app-git-main.vercel.app"
```

### Frontend (.env.production on Vercel)

```env
# Backend API URL (your Railway URL)
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
```

---

## Deployment Checklist

### Backend (Railway)

- [ ] Create Railway account
- [ ] Create new project from GitHub
- [ ] Set root directory to `server-v2`
- [ ] Add PostgreSQL database
- [ ] Set all environment variables:
  - [ ] DATABASE_URL (auto-set)
  - [ ] JWT_SECRET (generate secure key)
  - [ ] PORT=5000
  - [ ] NODE_ENV=production
  - [ ] CORS_ORIGINS (your Vercel URLs)
- [ ] Generate domain
- [ ] Test health endpoint
- [ ] Check deployment logs

### Frontend (Vercel)

- [ ] Add NEXT_PUBLIC_API_URL environment variable
- [ ] Redeploy latest deployment
- [ ] Test login/register
- [ ] Test file upload
- [ ] Verify API calls work

### Final Verification

- [ ] Register new account works
- [ ] Login works
- [ ] Dashboard loads
- [ ] File upload works
- [ ] Conflicts detection works
- [ ] No CORS errors in browser console

---

## Managing Your Deployment

### View Logs

```bash
# Via CLI
railway logs

# Via Dashboard
1. Click on service
2. Go to "Deployments"
3. Click deployment
4. View logs
```

### Restart Service

```bash
# Via CLI
railway restart

# Via Dashboard
1. Click service
2. Click "..." menu
3. Click "Restart"
```

### Update Code

Just push to GitHub:
```bash
git add .
git commit -m "Update backend"
git push origin main
```

Railway will automatically detect and deploy!

---

## Cost Estimate

**Railway Pricing (2025):**

- **Starter Plan:** $5/month
  - 500 execution hours included
  - $0.000231/GB-hour for RAM
  - $0.10/GB for network egress

- **Expected Monthly Cost:**
  - Small app: ~$5-10/month
  - Medium traffic: ~$10-20/month

**Free Trial:**
- $5 credit to start
- No credit card required
- Perfect for testing

---

## Next Steps After Deployment

1. **Set Up Custom Domain** (Optional)
   - In Railway: Settings → Domains → Add Custom Domain
   - Update DNS records
   - Update CORS_ORIGINS

2. **Add Monitoring**
   - Railway provides built-in metrics
   - Consider adding Sentry for error tracking

3. **Set Up Backups**
   - Railway PostgreSQL includes daily backups
   - Download backups from Railway dashboard

4. **Add CI/CD** (Optional)
   - Already set up! Push to main = auto-deploy
   - Add GitHub Actions for tests

---

## Support & Resources

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Prisma Docs:** https://www.prisma.io/docs

---

**Ready to Deploy?**

Start with Step 1 and follow the guide. Your backend will be live in ~10 minutes! 🚀
