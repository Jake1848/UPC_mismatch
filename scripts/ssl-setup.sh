#!/bin/bash

# SSL Certificate Setup Script using Let's Encrypt
# This script sets up SSL certificates for the production domains

set -e

# Configuration
DOMAINS=(
    "app.upcresolver.com"
    "api.upcresolver.com"
    "monitoring.upcresolver.com"
)
EMAIL="admin@upcresolver.com"  # Change this to your email

echo "🔒 Setting up SSL certificates with Let's Encrypt..."

# Check if email is configured
if [ "$EMAIL" = "admin@upcresolver.com" ]; then
    echo "❌ Please update the EMAIL variable in this script with your actual email address"
    exit 1
fi

# Create initial certificates directory
mkdir -p certbot/conf
mkdir -p certbot/www

# Generate dummy certificates for nginx to start
echo "📝 Generating dummy certificates for initial nginx startup..."
for domain in "${DOMAINS[@]}"; do
    mkdir -p "certbot/conf/live/$domain"

    # Generate dummy certificate
    openssl req -x509 -nodes -newkey rsa:2048 \
        -days 1 \
        -keyout "certbot/conf/live/$domain/privkey.pem" \
        -out "certbot/conf/live/$domain/fullchain.pem" \
        -subj "/CN=$domain"
done

# Start nginx with dummy certificates
echo "🌐 Starting nginx with dummy certificates..."
docker-compose -f docker-compose.prod.yml up -d nginx

# Wait for nginx to start
sleep 10

# Get real certificates
echo "🎫 Obtaining real SSL certificates..."
for domain in "${DOMAINS[@]}"; do
    echo "📋 Processing domain: $domain"

    # Remove dummy certificate
    rm -rf "certbot/conf/live/$domain"

    # Get real certificate
    docker-compose -f docker-compose.prod.yml run --rm certbot \
        certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --staging \
        -d "$domain"

    if [ $? -eq 0 ]; then
        echo "✅ Successfully obtained certificate for $domain"
    else
        echo "❌ Failed to obtain certificate for $domain"
        exit 1
    fi
done

# If staging certificates work, get production certificates
echo "🚀 Obtaining production certificates..."
for domain in "${DOMAINS[@]}"; do
    echo "📋 Processing domain: $domain (production)"

    # Remove staging certificate
    rm -rf "certbot/conf/live/$domain"

    # Get production certificate
    docker-compose -f docker-compose.prod.yml run --rm certbot \
        certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        -d "$domain"

    if [ $? -eq 0 ]; then
        echo "✅ Successfully obtained production certificate for $domain"
    else
        echo "❌ Failed to obtain production certificate for $domain"
        exit 1
    fi
done

# Reload nginx to use new certificates
echo "🔄 Reloading nginx with new certificates..."
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

# Set up certificate renewal
echo "⏰ Setting up certificate auto-renewal..."
echo "0 12 * * * cd /path/to/your/project && docker-compose -f docker-compose.prod.yml run --rm certbot renew && docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload" | crontab -

echo "🎉 SSL certificates have been successfully set up!"
echo ""
echo "📋 Certificate Status:"
for domain in "${DOMAINS[@]}"; do
    if [ -f "certbot/conf/live/$domain/fullchain.pem" ]; then
        echo "✅ $domain: Certificate exists"
        expiry=$(openssl x509 -enddate -noout -in "certbot/conf/live/$domain/fullchain.pem" | cut -d= -f2)
        echo "   Expires: $expiry"
    else
        echo "❌ $domain: No certificate found"
    fi
done

echo ""
echo "🔄 Auto-renewal has been set up via cron job"
echo "📝 Make sure to update the cron job path to match your project directory"