#!/bin/bash

# Deploy UPC Resolver to AWS EKS with zero-downtime
# This script provides infinite scalability through Kubernetes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
CLUSTER_NAME=${CLUSTER_NAME:-upc-resolver-cluster}
ECR_REPO=${ECR_REPO:-upc-resolver}
IMAGE_TAG=${IMAGE_TAG:-latest}
NAMESPACE=upc-resolver

echo -e "${BLUE}🚀 UPC Resolver - EKS Deployment${NC}"
echo "=================================="
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    exit 1
fi

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed${NC}"
    exit 1
fi

# Check eksctl
if ! command -v eksctl &> /dev/null; then
    echo -e "${RED}❌ eksctl is not installed${NC}"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites are installed${NC}"

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO"

echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "AWS Region: $AWS_REGION"
echo "Cluster Name: $CLUSTER_NAME"
echo "ECR Repository: $ECR_URI"
echo "Image Tag: $IMAGE_TAG"
echo ""

# Step 1: Create ECR repository if it doesn't exist
echo -e "${YELLOW}Step 1: Setting up ECR repository...${NC}"
aws ecr describe-repositories --repository-names $ECR_REPO --region $AWS_REGION &> /dev/null || {
    echo "Creating ECR repository..."
    aws ecr create-repository --repository-name $ECR_REPO --region $AWS_REGION
}

# Get ECR login token
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI

echo -e "${GREEN}✅ ECR repository ready${NC}"

# Step 2: Build and push Docker image
echo -e "${YELLOW}Step 2: Building and pushing Docker image...${NC}"
docker build -t $ECR_REPO:$IMAGE_TAG .
docker tag $ECR_REPO:$IMAGE_TAG $ECR_URI:$IMAGE_TAG
docker push $ECR_URI:$IMAGE_TAG

echo -e "${GREEN}✅ Docker image pushed to ECR${NC}"

# Step 3: Deploy AWS infrastructure
echo -e "${YELLOW}Step 3: Deploying AWS infrastructure...${NC}"
if [ -f "aws/infrastructure.yaml" ]; then
    aws cloudformation deploy \
        --template-file aws/infrastructure.yaml \
        --stack-name upc-resolver-infrastructure \
        --parameter-overrides \
            ClusterName=$CLUSTER_NAME \
            Environment=production \
        --capabilities CAPABILITY_IAM \
        --region $AWS_REGION

    echo -e "${GREEN}✅ AWS infrastructure deployed${NC}"
else
    echo -e "${RED}❌ aws/infrastructure.yaml not found${NC}"
    exit 1
fi

# Step 4: Configure kubectl
echo -e "${YELLOW}Step 4: Configuring kubectl...${NC}"
aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME

# Verify cluster connection
kubectl cluster-info

echo -e "${GREEN}✅ kubectl configured for EKS cluster${NC}"

# Step 5: Install AWS Load Balancer Controller
echo -e "${YELLOW}Step 5: Installing AWS Load Balancer Controller...${NC}"

# Create IAM OIDC identity provider
eksctl utils associate-iam-oidc-provider --region=$AWS_REGION --cluster=$CLUSTER_NAME --approve

# Create IAM service account
eksctl create iamserviceaccount \
  --cluster=$CLUSTER_NAME \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --role-name "AmazonEKSLoadBalancerControllerRole" \
  --attach-policy-arn=arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess \
  --override-existing-serviceaccounts \
  --approve \
  --region=$AWS_REGION

# Install AWS Load Balancer Controller using Helm
if ! command -v helm &> /dev/null; then
    echo "Installing Helm..."
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
fi

helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=$CLUSTER_NAME \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

echo -e "${GREEN}✅ AWS Load Balancer Controller installed${NC}"

# Step 6: Deploy Kubernetes manifests
echo -e "${YELLOW}Step 6: Deploying Kubernetes manifests...${NC}"

# Update deployment image
sed -i "s|image: upc-resolver:latest|image: $ECR_URI:$IMAGE_TAG|g" k8s/deployment.yaml

# Apply all Kubernetes manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml

# Note: Secrets need to be configured manually for security
echo -e "${YELLOW}⚠️  Please update k8s/secrets.yaml with your actual secrets before applying${NC}"
echo "Then run: kubectl apply -f k8s/secrets.yaml"

kubectl apply -f k8s/rbac.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/pod-disruption-budget.yaml

# Wait for ALB controller to be ready before applying ingress
echo "Waiting for AWS Load Balancer Controller to be ready..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=aws-load-balancer-controller -n kube-system --timeout=300s

kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/network-policy.yaml

echo -e "${GREEN}✅ Kubernetes manifests deployed${NC}"

# Step 7: Wait for deployment
echo -e "${YELLOW}Step 7: Waiting for deployment to be ready...${NC}"
kubectl wait --for=condition=available --timeout=600s deployment/upc-resolver-api -n $NAMESPACE

echo -e "${GREEN}✅ Deployment is ready${NC}"

# Step 8: Get service information
echo -e "${YELLOW}Step 8: Getting service information...${NC}"

# Wait for load balancer to get external IP
echo "Waiting for load balancer to get external IP..."
while true; do
    EXTERNAL_IP=$(kubectl get svc upc-resolver-api-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
    if [ ! -z "$EXTERNAL_IP" ]; then
        break
    fi
    echo "Waiting for external IP..."
    sleep 10
done

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "======================"
echo ""
echo -e "${YELLOW}Your application is now running with infinite scalability:${NC}"
echo ""
echo "Load Balancer URL: http://$EXTERNAL_IP"
echo "Health Check: http://$EXTERNAL_IP/health"
echo ""
echo -e "${YELLOW}Scaling Configuration:${NC}"
echo "• Min Replicas: 3"
echo "• Max Replicas: 100"
echo "• Auto-scaling on CPU (70%) and Memory (80%)"
echo "• Cluster can scale from 2-100 nodes automatically"
echo ""
echo -e "${YELLOW}Monitoring:${NC}"
echo "• Prometheus metrics: http://$EXTERNAL_IP/metrics"
echo "• Health checks: Automated with ALB"
echo "• Alerts: Configured for errors, latency, and pod health"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Configure your domain DNS to point to: $EXTERNAL_IP"
echo "2. Update SSL certificate ARN in k8s/ingress.yaml"
echo "3. Apply secrets: kubectl apply -f k8s/secrets.yaml"
echo "4. Set up monitoring dashboard in AWS CloudWatch or Grafana"
echo ""
echo -e "${BLUE}📊 Check status with:${NC}"
echo "kubectl get pods -n $NAMESPACE"
echo "kubectl get hpa -n $NAMESPACE"
echo "kubectl top pods -n $NAMESPACE"
echo ""
echo -e "${GREEN}Your SaaS now has infinite scalability! 🚀${NC}"