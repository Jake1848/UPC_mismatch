# Multi-stage production build for Railway deployment
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache libc6-compat postgresql-client

WORKDIR /app

# Copy root package.json for workspace setup
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install all dependencies
RUN npm ci --workspace=server --only=production
RUN npm ci --workspace=client --only=production

# Build client
FROM base AS client-builder
COPY client ./client
WORKDIR /app/client
RUN npm run build

# Build server
FROM base AS server-builder
COPY server ./server
WORKDIR /app/server
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install system dependencies for production
RUN apk add --no-cache \
    libc6-compat \
    postgresql-client \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy built server application
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/package.json ./package.json

# Copy client build for serving static files
COPY --from=client-builder /app/client/build ./public

# Copy necessary runtime files
COPY server/prisma ./prisma
COPY scripts ./scripts

# Make scripts executable
RUN chmod +x scripts/*.sh

# Generate Prisma client
RUN npx prisma generate

# Create logs directory
RUN mkdir -p logs uploads backups

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start command
CMD ["node", "dist/app.js"]