# 🚀 Complete Setup Guide - Get Your UPC Resolver Live

Follow these exact steps to deploy your infinitely scalable UPC Resolver to AWS.

## 🛠️ Step 1: Install Required Tools

### On Windows (WSL) - Your Current Environment:

```bash
# 1. Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
rm -rf aws awscliv2.zip

# 2. Install kubectl
curl -o kubectl https://amazon-eks.s3.us-west-2.amazonaws.com/1.21.2/2021-07-05/bin/linux/amd64/kubectl
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# 3. Install eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# 4. Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify installations
aws --version
kubectl version --client
eksctl version
helm version
```

### Alternative: Use AWS CloudShell (Recommended)
1. Go to [AWS Console](https://console.aws.amazon.com)
2. Click the CloudShell icon (terminal) in the top navigation
3. All tools are pre-installed!

## 🔑 Step 2: Configure AWS Access

### Option A: AWS CloudShell (Easiest)
- Already configured with your account!

### Option B: Local Setup
```bash
# Configure AWS credentials
aws configure

# You'll need:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region: us-east-1
# - Output format: json
```

### Get AWS Credentials:
1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click "Users" → "Create User"
3. Username: `upc-resolver-deploy`
4. Attach policies:
   - `AmazonEKSClusterPolicy`
   - `AmazonEKSWorkerNodePolicy`
   - `AmazonEKS_CNI_Policy`
   - `AmazonEC2ContainerRegistryFullAccess`
   - `IAMFullAccess`
   - `AmazonVPCFullAccess`
   - `AmazonEC2FullAccess`
   - `AmazonRDSFullAccess`
   - `ElastiCacheFullAccess`
5. Go to "Security credentials" → "Create access key"
6. Copy the Access Key ID and Secret Access Key

## 📝 Step 3: Update Configuration Files

### 3.1: Update Secrets (CRITICAL)
```bash
# Edit the secrets file
nano k8s/secrets.yaml
```

**Replace ALL "CHANGE_ME" values:**

```yaml
stringData:
  DATABASE_URL: "postgresql://upcuser:YOUR_DB_PASSWORD@upc-resolver-db.cluster-xxx.us-east-1.rds.amazonaws.com:5432/upc_resolver"
  REDIS_URL: "redis://upc-resolver-redis.xxx.cache.amazonaws.com:6379"
  JWT_SECRET: "your-64-character-jwt-secret-generated-below"
  STRIPE_SECRET_KEY: "sk_test_your_stripe_test_key"
  STRIPE_WEBHOOK_SECRET: "whsec_your_webhook_secret"
  AWS_ACCESS_KEY_ID: "your_aws_access_key"
  AWS_SECRET_ACCESS_KEY: "your_aws_secret_key"
  FRONTEND_URL: "https://your-domain.com"
  BACKEND_URL: "https://your-domain.com"
```

### 3.2: Generate JWT Secret
```bash
# Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3.3: Get Stripe Keys (Optional - for payments)
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Get your test keys from "Developers" → "API keys"

### 3.4: Update Domain in Ingress
```bash
# Edit ingress configuration
nano k8s/ingress.yaml
```

Replace `your-domain.com` with your actual domain or use the load balancer URL initially.

## 🚀 Step 4: Deploy to AWS

### 4.1: Clone/Upload Your Code
If using CloudShell:
```bash
# Upload your project files or clone from GitHub
git clone https://github.com/YOUR_USERNAME/UPC_mismatch.git
cd UPC_mismatch
```

### 4.2: Run the Deployment Script
```bash
# Make script executable
chmod +x scripts/deploy-to-eks.sh

# Deploy everything
./scripts/deploy-to-eks.sh
```

This script will:
- ✅ Create ECR repository
- ✅ Build and push Docker image
- ✅ Deploy AWS infrastructure (EKS, RDS, Redis)
- ✅ Configure kubectl
- ✅ Install AWS Load Balancer Controller
- ✅ Deploy your application
- ✅ Set up auto-scaling

**Deployment time: ~15-20 minutes**

## 🔧 Step 5: Configure Secrets

After infrastructure is deployed:

```bash
# Update secrets with actual AWS endpoints
kubectl apply -f k8s/secrets.yaml -n upc-resolver

# Restart deployment to pick up new secrets
kubectl rollout restart deployment/upc-resolver-api -n upc-resolver
```

## 🌐 Step 6: Get Your Live URL

```bash
# Get your load balancer URL
kubectl get svc upc-resolver-api-service -n upc-resolver

# Output will show something like:
# EXTERNAL-IP: a1b2c3d4-1234567890.us-east-1.elb.amazonaws.com
```

Your site is now live at: `http://EXTERNAL-IP`

## 🔒 Step 7: Set Up SSL (Optional)

### 7.1: Get SSL Certificate
```bash
# Request SSL certificate in AWS Certificate Manager
aws acm request-certificate \
  --domain-name your-domain.com \
  --subject-alternative-names "*.your-domain.com" \
  --validation-method DNS \
  --region us-east-1
```

### 7.2: Update Ingress with Certificate ARN
```bash
# Edit ingress.yaml and add your certificate ARN
nano k8s/ingress.yaml

# Apply changes
kubectl apply -f k8s/ingress.yaml -n upc-resolver
```

## 📊 Step 8: Verify Everything Works

```bash
# Check deployment status
kubectl get pods -n upc-resolver

# Check auto-scaling
kubectl get hpa -n upc-resolver

# Check logs
kubectl logs -f deployment/upc-resolver-api -n upc-resolver

# Test your site
curl http://YOUR_LOAD_BALANCER_URL/health
```

## 🎉 You're Live!

Your UPC Resolver is now running with:
- ✅ **Infinite scalability** (3-100 pods, 2-100 nodes)
- ✅ **Auto-scaling** based on traffic
- ✅ **Load balancing** across multiple instances
- ✅ **Database clustering** with read replicas
- ✅ **Redis caching** for performance
- ✅ **Zero-downtime deployments**
- ✅ **Production monitoring**

## 💰 Expected Costs

- **Development/Testing**: ~$50-100/month
- **Small Production**: ~$150/month
- **Growing**: Scales automatically with usage

## 🆘 Troubleshooting

### Common Issues:

**1. Pods not starting:**
```bash
kubectl describe pods -n upc-resolver
kubectl logs deployment/upc-resolver-api -n upc-resolver
```

**2. Load balancer not getting external IP:**
```bash
kubectl describe svc upc-resolver-api-service -n upc-resolver
```

**3. Database connection errors:**
- Check that secrets are properly configured
- Verify database endpoints in AWS RDS console

**4. Permission errors:**
- Ensure your AWS user has all required policies
- Check IAM roles in AWS console

## 🔄 Updates and Deployments

### Deploy new version:
```bash
# Build new image
docker build -t upc-resolver:v2 .
docker tag upc-resolver:v2 $ECR_URI:v2
docker push $ECR_URI:v2

# Update deployment
kubectl set image deployment/upc-resolver-api upc-resolver-api=$ECR_URI:v2 -n upc-resolver

# Monitor rollout
kubectl rollout status deployment/upc-resolver-api -n upc-resolver
```

## 📞 Need Help?

- **Check logs**: `kubectl logs -f deployment/upc-resolver-api -n upc-resolver`
- **Check AWS Console**: Monitor EKS, RDS, and ElastiCache services
- **Verify configuration**: Review `k8s/secrets.yaml` for correct values

---

**Your SaaS is now infinitely scalable and ready for viral growth! 🚀**