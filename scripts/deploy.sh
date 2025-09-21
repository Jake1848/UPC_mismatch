#!/bin/bash

# Production Deployment Script for UPC Conflict Resolver
# This script deploys the application to production using Docker Compose

set -e

echo "🚀 Starting production deployment..."

# Check if required files exist
if [ ! -f ".env.prod" ]; then
    echo "❌ Error: .env.prod file not found!"
    echo "Please copy .env.prod.example to .env.prod and configure your production environment variables."
    exit 1
fi

if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Error: docker-compose.prod.yml not found!"
    exit 1
fi

# Load environment variables
echo "📋 Loading environment variables..."
export $(cat .env.prod | grep -v '^#' | xargs)

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p certbot/conf
mkdir -p certbot/www
mkdir -p monitoring/prometheus
mkdir -p monitoring/grafana/dashboards
mkdir -p monitoring/grafana/datasources
mkdir -p monitoring/fluentd/conf

# Pull latest images
echo "📦 Pulling latest Docker images..."
docker-compose -f docker-compose.prod.yml pull

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 30

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy

# Generate Prisma client
echo "🔧 Generating Prisma client..."
docker-compose -f docker-compose.prod.yml exec -T api npx prisma generate

# Check service health
echo "🏥 Checking service health..."
sleep 10

# Check API health
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ API service is healthy"
else
    echo "❌ API service is not responding"
    exit 1
fi

# Check Frontend health
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend service is healthy"
else
    echo "❌ Frontend service is not responding"
    exit 1
fi

echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Service Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "📊 Next Steps:"
echo "1. Configure SSL certificates with Let's Encrypt"
echo "2. Set up DNS records to point to your server"
echo "3. Configure monitoring alerts"
echo "4. Set up backup schedules"
echo ""
echo "🔗 Access your application:"
echo "   Frontend: https://app.upcresolver.com"
echo "   API: https://api.upcresolver.com"
echo "   Monitoring: https://monitoring.upcresolver.com"