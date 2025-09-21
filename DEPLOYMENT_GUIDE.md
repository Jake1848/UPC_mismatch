# 🚀 Live Site Deployment Guide

## Quick Start Options

### Option 1: Railway (Recommended - Easiest)
**Cost**: ~$20/month | **Setup Time**: 15 minutes | **Difficulty**: Beginner

### Option 2: DigitalOcean App Platform
**Cost**: ~$30/month | **Setup Time**: 30 minutes | **Difficulty**: Beginner

### Option 3: AWS (Most Scalable)
**Cost**: ~$50/month | **Setup Time**: 2 hours | **Difficulty**: Advanced

### Option 4: VPS (Most Control)
**Cost**: ~$15/month | **Setup Time**: 1 hour | **Difficulty**: Intermediate

---

## 🚂 Option 1: Railway (RECOMMENDED)

Railway is perfect for deploying containerized applications with minimal configuration.

### Step 1: Prepare Your Code
```bash
# Your code is already ready! Just need these files:
```

Create `railway.toml`:
```toml
[build]
builder = "dockerfile"
dockerfilePath = "server/Dockerfile.prod"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "always"
```

Create `Dockerfile` in project root:
```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

# Install dependencies for both client and server
WORKDIR /app

# Copy package files
COPY client/package*.json ./client/
COPY server/package*.json ./server/
COPY package*.json ./

# Install dependencies
RUN cd client && npm ci --only=production
RUN cd server && npm ci --only=production

# Build client
COPY client ./client
RUN cd client && npm run build

# Build server
COPY server ./server
RUN cd server && npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy built applications
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/client/build ./client/build

# Copy necessary files
COPY server/prisma ./server/prisma
COPY scripts ./scripts

# Install production dependencies and Prisma
RUN cd server && npx prisma generate

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

USER nodejs

EXPOSE 5000

CMD ["node", "server/dist/app.js"]
```

### Step 2: Deploy to Railway

1. **Sign up at [railway.app](https://railway.app)**
2. **Connect your GitHub repository**
3. **Click "Deploy from GitHub"**
4. **Select your `UPC_mismatch` repository**

### Step 3: Add Environment Variables in Railway

In Railway dashboard, go to Variables and add:

```env
# Database (Railway provides PostgreSQL)
DATABASE_URL=${RAILWAY_POSTGRES_URL}

# Generate these secure values
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Railway provides Redis
REDIS_URL=${RAILWAY_REDIS_URL}

# AWS (sign up for free tier)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=upc-resolver-prod-files

# URLs (Railway auto-generates)
FRONTEND_URL=https://your-app.railway.app
BACKEND_URL=https://your-app.railway.app

# Production settings
NODE_ENV=production
PORT=5000
```

### Step 4: Add Database and Redis

1. In Railway dashboard, click **"Add Service"**
2. Select **"PostgreSQL"**
3. Click **"Add Service"** again
4. Select **"Redis"**

Railway will automatically set the connection URLs!

### Step 5: Custom Domain (Optional)

1. **Buy a domain** (e.g., from Namecheap, GoDaddy)
2. In Railway, go to **Settings > Domains**
3. Add your custom domain: `upcresolver.com`
4. Update your DNS records as shown by Railway

**Your site will be live at**: `https://your-app.railway.app` 🎉

---

## 🌊 Option 2: DigitalOcean App Platform

### Step 1: Prepare App Spec

Create `.do/app.yaml`:
```yaml
name: upc-resolver
services:
- name: api
  source_dir: /
  dockerfile_path: server/Dockerfile.prod
  github:
    repo: Jake1848/UPC_mismatch
    branch: master
  instance_count: 1
  instance_size_slug: basic-xxs
  http_port: 5000
  health_check:
    http_path: /health
  envs:
  - key: NODE_ENV
    value: production
  - key: DATABASE_URL
    value: ${db.DATABASE_URL}
  - key: REDIS_URL
    value: ${redis.DATABASE_URL}

databases:
- name: db
  engine: PG
  version: "14"
  size: basic-xs

- name: redis
  engine: REDIS
  version: "7"
  size: basic-xs

static_sites:
- name: frontend
  source_dir: /client
  github:
    repo: Jake1848/UPC_mismatch
    branch: master
  build_command: npm run build
  output_dir: build
```

### Step 2: Deploy

1. **Sign up at [DigitalOcean](https://digitalocean.com)**
2. Go to **Apps > Create App**
3. Connect your GitHub repository
4. DigitalOcean will auto-detect the `app.yaml`
5. Add environment variables
6. Deploy!

---

## ☁️ Option 3: AWS (Most Scalable)

### Step 1: AWS Infrastructure

Create `aws/infrastructure.yml` (CloudFormation):
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'UPC Resolver Production Infrastructure'

Resources:
  # ECS Cluster
  UPCResolverCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: upc-resolver-prod

  # RDS PostgreSQL
  UPCResolverDB:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: upc-resolver-prod
      DBInstanceClass: db.t3.micro
      Engine: postgres
      EngineVersion: '14'
      MasterUsername: !Ref DBUsername
      MasterUserPassword: !Ref DBPassword
      AllocatedStorage: 20
      VPCSecurityGroups:
        - !Ref DBSecurityGroup

  # ElastiCache Redis
  UPCResolverRedis:
    Type: AWS::ElastiCache::CacheCluster
    Properties:
      CacheNodeType: cache.t3.micro
      Engine: redis
      NumCacheNodes: 1

  # Application Load Balancer
  UPCResolverALB:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Scheme: internet-facing
      Type: application
      Subnets:
        - !Ref PublicSubnet1
        - !Ref PublicSubnet2

Parameters:
  DBUsername:
    Type: String
    Default: upcuser
  DBPassword:
    Type: String
    NoEcho: true
    MinLength: 8
```

### Step 2: Deploy with AWS CDK

1. **Install AWS CLI and CDK**
2. **Configure AWS credentials**
3. **Deploy infrastructure**:
```bash
cdk deploy UPCResolverStack
```

---

## 🖥️ Option 4: VPS (Ubuntu Server)

### Step 1: Get a VPS

**Recommended providers**:
- **Linode**: $5/month (1GB RAM)
- **DigitalOcean**: $6/month (1GB RAM)
- **Vultr**: $6/month (1GB RAM)

### Step 2: Server Setup

```bash
# Connect to your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install docker-compose -y

# Install Node.js (for scripts)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Clone your repository
git clone https://github.com/Jake1848/UPC_mismatch.git
cd UPC_mismatch
```

### Step 3: Configure Environment

Create `.env.production`:
```env
DATABASE_URL=postgresql://upcuser:secure_password@postgres:5432/upc_resolver
REDIS_URL=redis://redis:6379
JWT_SECRET=your-super-secure-jwt-secret-here
STRIPE_SECRET_KEY=sk_live_your_stripe_key
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=upc-resolver-files
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://your-domain.com
NODE_ENV=production
```

### Step 4: Deploy

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Deploy
./scripts/deploy-advanced.sh production
```

### Step 5: Set up Nginx Reverse Proxy

```bash
# Install Nginx
apt install nginx -y

# Configure Nginx
cat > /etc/nginx/sites-available/upcresolver << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/upcresolver /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### Step 6: SSL with Let's Encrypt

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d your-domain.com

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

---

## 🎯 WHAT YOU NEED TO PROVIDE

### 1. **Domain Name** (Optional but recommended)
- Buy from: Namecheap, GoDaddy, or Google Domains
- Cost: ~$10-15/year
- Examples: `upcresolver.com`, `conflictfixer.io`

### 2. **Third-Party Services** (Free tiers available)

#### **Stripe Account** (Payment Processing)
1. Sign up at [stripe.com](https://stripe.com)
2. Get your **Secret Key** from Dashboard → API Keys
3. Set up webhook endpoint

#### **AWS Account** (File Storage)
1. Sign up at [aws.amazon.com](https://aws.amazon.com) (Free tier: 5GB)
2. Create IAM user with S3 permissions
3. Create S3 bucket for file uploads

#### **Optional Integrations**
- **Slack**: For deployment notifications
- **Unleash**: For advanced feature flags
- **Sentry**: For error monitoring

### 3. **Environment Variables**

I'll help you generate secure values:

```bash
# Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate random passwords
openssl rand -base64 32
```

---

## 🚀 RECOMMENDED DEPLOYMENT PATH

### For Beginners: Railway
1. **5 minutes**: Sign up and connect GitHub
2. **10 minutes**: Add environment variables
3. **5 minutes**: Deploy automatically
4. **Total**: 20 minutes to live site!

### For Production: DigitalOcean + Custom Domain
1. **15 minutes**: Set up DigitalOcean App
2. **10 minutes**: Configure custom domain
3. **5 minutes**: SSL setup (automatic)
4. **Total**: 30 minutes to professional site!

---

## 📞 NEXT STEPS

**Tell me which option you prefer, and I'll provide detailed step-by-step instructions specific to your choice!**

1. **Railway** (Easiest, recommended for testing)
2. **DigitalOcean** (Best balance of ease and features)
3. **AWS** (Most scalable, enterprise-grade)
4. **VPS** (Most control and customization)

Also let me know:
- Do you have a domain name in mind?
- Do you already have AWS/Stripe accounts?
- What's your preferred monthly budget?

I'll guide you through every step to get your SaaS live! 🚀