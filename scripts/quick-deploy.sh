#!/bin/bash

# Quick deployment script for getting live fast
# This script helps you choose and deploy to your preferred platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Art header
cat << 'EOF'
🚀 UPC Resolver - Quick Deploy
===============================
Make your SaaS live in minutes!
EOF

echo ""

# Platform selection
echo -e "${BLUE}Choose your deployment platform:${NC}"
echo ""
echo -e "${GREEN}1)${NC} Railway     ${YELLOW}(Recommended - Easiest)${NC}"
echo -e "   └─ Cost: ~$20/month | Setup: 15 minutes"
echo ""
echo -e "${GREEN}2)${NC} DigitalOcean ${YELLOW}(Best Balance)${NC}"
echo -e "   └─ Cost: ~$30/month | Setup: 30 minutes"
echo ""
echo -e "${GREEN}3)${NC} VPS Server   ${YELLOW}(Most Control)${NC}"
echo -e "   └─ Cost: ~$15/month | Setup: 60 minutes"
echo ""
echo -e "${GREEN}4)${NC} Show environment variables needed"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo -e "${GREEN}🚂 Railway Deployment Guide${NC}"
        echo "================================"
        echo ""
        echo -e "${YELLOW}Step 1:${NC} Sign up at https://railway.app"
        echo -e "${YELLOW}Step 2:${NC} Connect your GitHub account"
        echo -e "${YELLOW}Step 3:${NC} Click 'Deploy from GitHub'"
        echo -e "${YELLOW}Step 4:${NC} Select your 'UPC_mismatch' repository"
        echo ""
        echo -e "${BLUE}Railway will automatically:${NC}"
        echo "✅ Detect the Dockerfile"
        echo "✅ Build your application"
        echo "✅ Provide a live URL"
        echo ""
        echo -e "${YELLOW}Step 5:${NC} Add these environment variables in Railway dashboard:"
        echo ""
        ;;
    2)
        echo ""
        echo -e "${GREEN}🌊 DigitalOcean Deployment Guide${NC}"
        echo "=================================="
        echo ""
        echo -e "${YELLOW}Step 1:${NC} Sign up at https://cloud.digitalocean.com"
        echo -e "${YELLOW}Step 2:${NC} Go to Apps → Create App"
        echo -e "${YELLOW}Step 3:${NC} Connect your GitHub repository"
        echo -e "${YELLOW}Step 4:${NC} DigitalOcean will detect the .do/app.yaml file"
        echo -e "${YELLOW}Step 5:${NC} Configure environment variables (see below)"
        echo -e "${YELLOW}Step 6:${NC} Click Deploy!"
        echo ""
        ;;
    3)
        echo ""
        echo -e "${GREEN}🖥️  VPS Server Deployment Guide${NC}"
        echo "=================================="
        echo ""
        echo -e "${YELLOW}Recommended VPS Providers:${NC}"
        echo "• Linode: $5/month (1GB RAM)"
        echo "• DigitalOcean: $6/month (1GB RAM)"
        echo "• Vultr: $6/month (1GB RAM)"
        echo ""
        echo -e "${YELLOW}Quick setup commands:${NC}"
        echo ""
        cat << 'EOF'
# 1. Connect to your server
ssh root@your-server-ip

# 2. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 3. Install Docker Compose
apt install docker-compose -y

# 4. Clone your repository
git clone https://github.com/Jake1848/UPC_mismatch.git
cd UPC_mismatch

# 5. Create environment file
cp .env.prod.example .env.production
# Edit .env.production with your values

# 6. Deploy
./scripts/deploy-advanced.sh production
EOF
        echo ""
        ;;
    4)
        # Show environment variables
        ;;
    *)
        echo -e "${RED}Invalid choice. Please run the script again.${NC}"
        exit 1
        ;;
esac

# Show environment variables for all options
echo -e "${PURPLE}🔧 Required Environment Variables${NC}"
echo "=================================="
echo ""
echo -e "${YELLOW}Essential (Required):${NC}"

cat << 'EOF'
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_URL=redis://host:6379
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://your-domain.com
EOF

echo ""
echo -e "${YELLOW}Payment Processing (Stripe):${NC}"
cat << 'EOF'
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
EOF

echo ""
echo -e "${YELLOW}File Storage (AWS S3 - Free Tier Available):${NC}"
cat << 'EOF'
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
EOF

echo ""
echo -e "${BLUE}💡 Quick Setup Tips:${NC}"
echo ""

# Generate secure JWT secret
echo -e "${YELLOW}Generate a secure JWT secret:${NC}"
if command -v node &> /dev/null; then
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    echo "JWT_SECRET=$JWT_SECRET"
else
    echo "Run this command: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
fi

echo ""
echo -e "${YELLOW}Free Service Signups:${NC}"
echo "• Stripe: https://stripe.com (free test account)"
echo "• AWS: https://aws.amazon.com (free tier: 5GB storage)"
echo ""

echo -e "${GREEN}🎉 Your site will be live at:${NC}"
case $choice in
    1)
        echo "https://your-app-name.railway.app"
        ;;
    2)
        echo "https://your-app-name.ondigitalocean.app"
        ;;
    3)
        echo "https://your-domain.com (with your custom domain)"
        ;;
esac

echo ""
echo -e "${BLUE}📞 Need help? Check the full DEPLOYMENT_GUIDE.md for detailed instructions!${NC}"