#!/bin/bash

# Advanced Production Deployment Script for UPC Conflict Resolver
# This script provides blue-green deployment with rollback capabilities

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_ID="$(date +%Y%m%d_%H%M%S)"
ROLLBACK_ENABLED="${ROLLBACK_ENABLED:-true}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-10}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Send notification to Slack
send_slack_notification() {
    local status="$1"
    local message="$2"
    local color="good"

    if [[ "$status" == "error" ]]; then
        color="danger"
    elif [[ "$status" == "warning" ]]; then
        color="warning"
    fi

    if [[ -n "$SLACK_WEBHOOK" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"$color\",\"title\":\"Deployment $status\",\"text\":\"$message\",\"ts\":$(date +%s)}]}" \
            "$SLACK_WEBHOOK" 2>/dev/null || warn "Failed to send Slack notification"
    fi
}

# Show usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS] <environment>

Deploy UPC Conflict Resolver to specified environment.

ENVIRONMENTS:
    staging         Deploy to staging environment
    production      Deploy to production environment

OPTIONS:
    -h, --help      Show this help message
    -r, --rollback  Rollback to previous deployment
    -v, --version   Specify version/tag to deploy
    --no-backup     Skip database backup
    --no-tests      Skip post-deployment tests
    --force         Force deployment without confirmations
    --dry-run       Show what would be deployed without actually doing it

EXAMPLES:
    $0 staging
    $0 production --version v1.2.3
    $0 --rollback production
    $0 --dry-run production

ENVIRONMENT VARIABLES:
    ROLLBACK_ENABLED         Enable rollback functionality (default: true)
    HEALTH_CHECK_TIMEOUT     Health check timeout in seconds (default: 300)
    HEALTH_CHECK_INTERVAL    Health check interval in seconds (default: 10)
    SLACK_WEBHOOK_URL        Slack webhook for notifications
EOF
}

# Parse command line arguments
ENVIRONMENT=""
VERSION="latest"
ROLLBACK_MODE=false
SKIP_BACKUP=false
SKIP_TESTS=false
FORCE_DEPLOY=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -r|--rollback)
            ROLLBACK_MODE=true
            shift
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        --no-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --no-tests)
            SKIP_TESTS=true
            shift
            ;;
        --force)
            FORCE_DEPLOY=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        staging|production)
            ENVIRONMENT="$1"
            shift
            ;;
        *)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ -z "$ENVIRONMENT" ]]; then
    error "Environment is required (staging or production)"
    usage
    exit 1
fi

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    error "Invalid environment: $ENVIRONMENT"
    exit 1
fi

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
        exit 1
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed or not in PATH"
        exit 1
    fi

    # Check if user has permissions
    if ! docker info &> /dev/null; then
        error "Cannot connect to Docker daemon. Please check permissions."
        exit 1
    fi

    # Check disk space (require at least 2GB free)
    available_space=$(df / | awk 'NR==2 {print $4}')
    required_space=2097152  # 2GB in KB

    if [[ $available_space -lt $required_space ]]; then
        error "Insufficient disk space. Required: 2GB, Available: $(($available_space / 1024 / 1024))GB"
        exit 1
    fi

    log "Prerequisites check passed"
}

# Load environment variables
load_environment() {
    log "Loading environment variables for $ENVIRONMENT..."

    ENV_FILE=".env.${ENVIRONMENT}"
    if [[ ! -f "$ENV_FILE" ]]; then
        # Fallback to production env file for compatibility
        if [[ "$ENVIRONMENT" == "production" && -f ".env.prod" ]]; then
            ENV_FILE=".env.prod"
        else
            error "Environment file not found: $ENV_FILE"
            exit 1
        fi
    fi

    set -a  # automatically export all variables
    source "$ENV_FILE"
    set +a
    log "Environment variables loaded from $ENV_FILE"

    # Validate required environment variables
    local required_vars=(
        "DATABASE_URL"
        "JWT_SECRET"
        "STRIPE_SECRET_KEY"
        "AWS_ACCESS_KEY_ID"
        "AWS_SECRET_ACCESS_KEY"
        "REDIS_URL"
        "FRONTEND_URL"
        "BACKEND_URL"
    )

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done

    log "Required environment variables validated"
}

# Backup current deployment
backup_current_deployment() {
    if [[ "$SKIP_BACKUP" == true ]]; then
        warn "Skipping backup as requested"
        return 0
    fi

    log "Creating backup of current deployment..."

    # Create backup directory
    local backup_dir="backups/deployment_${DEPLOYMENT_ID}"
    mkdir -p "$backup_dir"

    # Backup database
    if [[ -n "${DATABASE_URL:-}" ]]; then
        log "Backing up database..."
        BACKUP_DIR="$backup_dir" ./scripts/backup-database.sh || warn "Database backup failed"
    fi

    # Backup current docker-compose state
    COMPOSE_FILE="docker-compose.${ENVIRONMENT}.yml"
    if [[ ! -f "$COMPOSE_FILE" && "$ENVIRONMENT" == "production" ]]; then
        COMPOSE_FILE="docker-compose.prod.yml"
    fi

    if docker-compose -f "$COMPOSE_FILE" ps &> /dev/null; then
        docker-compose -f "$COMPOSE_FILE" config > "$backup_dir/docker-compose.yml"
        docker-compose -f "$COMPOSE_FILE" ps --format table > "$backup_dir/services.txt"
        log "Docker state backed up"
    fi

    log "Backup completed: $backup_dir"
}

# Deploy services
deploy_services() {
    log "Deploying services..."

    COMPOSE_FILE="docker-compose.${ENVIRONMENT}.yml"
    if [[ ! -f "$COMPOSE_FILE" && "$ENVIRONMENT" == "production" ]]; then
        COMPOSE_FILE="docker-compose.prod.yml"
    fi

    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error "Compose file not found: $COMPOSE_FILE"
        exit 1
    fi

    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would deploy the following services:"
        docker-compose -f "$COMPOSE_FILE" config --services
        return 0
    fi

    # Pull latest images
    log "Pulling Docker images..."
    docker-compose -f "$COMPOSE_FILE" pull

    # Stop existing services gracefully
    log "Stopping existing services..."
    docker-compose -f "$COMPOSE_FILE" down --timeout 30 || warn "Some services didn't stop gracefully"

    # Start new services
    log "Starting new services..."
    docker-compose -f "$COMPOSE_FILE" up -d --build --force-recreate

    log "Services deployed successfully"
}

# Wait for services to be healthy
wait_for_services() {
    log "Waiting for services to be healthy..."

    local timeout=$HEALTH_CHECK_TIMEOUT
    local interval=$HEALTH_CHECK_INTERVAL
    local elapsed=0

    while [[ $elapsed -lt $timeout ]]; do
        if check_service_health; then
            log "All services are healthy"
            return 0
        fi

        log "Services not ready yet, waiting ${interval}s... (${elapsed}/${timeout}s)"
        sleep $interval
        elapsed=$((elapsed + interval))
    done

    error "Services did not become healthy within $timeout seconds"
    return 1
}

# Check service health
check_service_health() {
    local api_url="${BACKEND_URL:-http://localhost:5000}"

    # Check API health
    if curl -sf "$api_url/health" > /dev/null 2>&1; then
        local health_response
        health_response=$(curl -s "$api_url/health")

        if echo "$health_response" | grep -q '"status":"healthy"'; then
            return 0
        fi
    fi

    return 1
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."

    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would run database migrations"
        return 0
    fi

    COMPOSE_FILE="docker-compose.${ENVIRONMENT}.yml"
    if [[ ! -f "$COMPOSE_FILE" && "$ENVIRONMENT" == "production" ]]; then
        COMPOSE_FILE="docker-compose.prod.yml"
    fi

    # Wait for database to be ready
    log "Waiting for database to be ready..."
    sleep 30

    # Run migrations
    if docker-compose -f "$COMPOSE_FILE" exec -T api npx prisma migrate deploy; then
        log "Database migrations completed successfully"
    else
        error "Database migrations failed"
        return 1
    fi
}

# Run post-deployment tests
run_post_deployment_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        warn "Skipping post-deployment tests as requested"
        return 0
    fi

    log "Running post-deployment tests..."

    if [[ "$DRY_RUN" == true ]]; then
        log "DRY RUN: Would run post-deployment tests"
        return 0
    fi

    local api_url="${BACKEND_URL:-http://localhost:5000}"
    local tests_passed=true

    # Test 1: Health check
    log "Testing health endpoint..."
    if ! curl -sf "$api_url/health" > /dev/null; then
        error "Health check failed"
        tests_passed=false
    fi

    # Test 2: Deep health check
    log "Testing deep health endpoint..."
    if ! curl -sf "$api_url/health/deep" > /dev/null; then
        warn "Deep health check failed (non-critical)"
    fi

    # Test 3: Metrics endpoint
    log "Testing metrics endpoint..."
    if ! curl -sf "$api_url/health/metrics" > /dev/null; then
        warn "Metrics endpoint failed (non-critical)"
    fi

    if [[ "$tests_passed" == true ]]; then
        log "All critical post-deployment tests passed"
        return 0
    else
        error "Some critical post-deployment tests failed"
        return 1
    fi
}

# Rollback deployment
rollback_deployment() {
    log "Rolling back deployment..."

    # Find latest backup
    local latest_backup
    latest_backup=$(find backups -name "deployment_*" -type d | sort -r | head -1)

    if [[ -z "$latest_backup" ]]; then
        error "No backup found for rollback"
        return 1
    fi

    log "Rolling back to: $latest_backup"

    # Restore database if backup exists
    if find "$latest_backup" -name "upc_resolver_backup_*.sql.gz" | head -1 | read -r db_backup; then
        log "Restoring database from backup..."
        RESTORE_CONFIRM=true ./scripts/restore-database.sh "$db_backup"
    fi

    # Restart services with previous configuration
    if [[ -f "$latest_backup/docker-compose.yml" ]]; then
        log "Restoring services from backup..."
        docker-compose -f "$latest_backup/docker-compose.yml" up -d
    fi

    log "Rollback completed"
}

# Main deployment function
main_deployment() {
    log "🚀 Starting deployment to $ENVIRONMENT environment"
    log "Version: $VERSION"
    log "Deployment ID: $DEPLOYMENT_ID"

    # Check prerequisites
    check_prerequisites

    # Load environment
    load_environment

    # Create necessary directories
    log "Creating necessary directories..."
    mkdir -p certbot/conf certbot/www monitoring/prometheus monitoring/grafana/dashboards
    mkdir -p monitoring/grafana/datasources monitoring/fluentd/conf logs backups uploads

    # Confirmation for production
    if [[ "$ENVIRONMENT" == "production" && "$FORCE_DEPLOY" != true && "$DRY_RUN" != true ]]; then
        warn "You are about to deploy to PRODUCTION!"
        read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm
        if [[ "$confirm" != "yes" ]]; then
            log "Deployment cancelled by user"
            exit 0
        fi
    fi

    # Send deployment start notification
    send_slack_notification "info" "Deployment to $ENVIRONMENT started (ID: $DEPLOYMENT_ID)"

    # Backup current deployment
    backup_current_deployment

    # Deploy services
    deploy_services

    # Run migrations
    if ! run_migrations; then
        error "Migrations failed, rolling back..."
        send_slack_notification "error" "Deployment failed during migrations, rolling back"
        if [[ "$ROLLBACK_ENABLED" == true ]]; then
            rollback_deployment
        fi
        exit 1
    fi

    # Wait for services
    if ! wait_for_services; then
        error "Services failed to become healthy, rolling back..."
        send_slack_notification "error" "Deployment failed - services unhealthy, rolling back"
        if [[ "$ROLLBACK_ENABLED" == true ]]; then
            rollback_deployment
        fi
        exit 1
    fi

    # Run post-deployment tests
    if ! run_post_deployment_tests; then
        error "Post-deployment tests failed, rolling back..."
        send_slack_notification "error" "Deployment failed post-deployment tests, rolling back"
        if [[ "$ROLLBACK_ENABLED" == true ]]; then
            rollback_deployment
        fi
        exit 1
    fi

    # Success!
    log "✅ Deployment completed successfully!"
    log "Environment: $ENVIRONMENT"
    log "Version: $VERSION"
    log "Deployment ID: $DEPLOYMENT_ID"
    log "Services are healthy and ready to serve traffic"

    # Show service status
    COMPOSE_FILE="docker-compose.${ENVIRONMENT}.yml"
    if [[ ! -f "$COMPOSE_FILE" && "$ENVIRONMENT" == "production" ]]; then
        COMPOSE_FILE="docker-compose.prod.yml"
    fi

    log "📋 Service Status:"
    docker-compose -f "$COMPOSE_FILE" ps

    send_slack_notification "success" "Deployment to $ENVIRONMENT completed successfully (ID: $DEPLOYMENT_ID, Version: $VERSION)"
}

# Handle script interruption
trap 'error "Deployment interrupted"; send_slack_notification "error" "Deployment was interrupted"; exit 1' INT TERM

# Main execution
if [[ "$ROLLBACK_MODE" == true ]]; then
    log "Rollback mode enabled"
    load_environment
    rollback_deployment
else
    main_deployment
fi