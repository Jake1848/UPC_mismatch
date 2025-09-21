#!/bin/bash

# Database Backup Script for UPC Conflict Resolver
# This script creates automated backups with rotation and uploads to S3

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BACKUP_BUCKET:-upc-resolver-backups}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="upc_resolver_backup_${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Send notification to Slack
send_slack_notification() {
    local status="$1"
    local message="$2"

    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local color="good"
        if [[ "$status" == "error" ]]; then
            color="danger"
        elif [[ "$status" == "warning" ]]; then
            color="warning"
        fi

        curl -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"$color\",\"title\":\"Database Backup - $status\",\"text\":\"$message\",\"ts\":$(date +%s)}]}" \
            "$SLACK_WEBHOOK" 2>/dev/null || warn "Failed to send Slack notification"
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check if DATABASE_URL is set
    if [[ -z "${DATABASE_URL:-}" ]]; then
        error "DATABASE_URL environment variable is not set"
        exit 1
    fi

    # Check if pg_dump is available
    if ! command -v pg_dump &> /dev/null; then
        error "pg_dump could not be found. Please install PostgreSQL client tools."
        exit 1
    fi

    # Check AWS CLI if S3 backup is enabled
    if [[ -n "${S3_BUCKET:-}" ]] && ! command -v aws &> /dev/null; then
        warn "AWS CLI not found. S3 backup will be skipped."
        S3_BUCKET=""
    fi

    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    log "Prerequisites check completed"
}

# Create database backup
create_backup() {
    log "Starting database backup..."

    local backup_file="${BACKUP_DIR}/${BACKUP_NAME}.sql"
    local compressed_file="${backup_file}.gz"

    # Create the backup
    if pg_dump "$DATABASE_URL" --no-password --verbose --clean --no-acl --no-owner > "$backup_file" 2>/dev/null; then
        log "Database backup created: $backup_file"

        # Compress the backup
        if gzip "$backup_file"; then
            log "Backup compressed: $compressed_file"
            echo "$compressed_file"
        else
            error "Failed to compress backup"
            return 1
        fi
    else
        error "Failed to create database backup"
        return 1
    fi
}

# Upload backup to S3
upload_to_s3() {
    local backup_file="$1"

    if [[ -z "$S3_BUCKET" ]]; then
        warn "S3 bucket not configured. Skipping S3 upload."
        return 0
    fi

    log "Uploading backup to S3..."

    local s3_key="database-backups/$(basename "$backup_file")"

    if aws s3 cp "$backup_file" "s3://${S3_BUCKET}/${s3_key}" \
        --storage-class STANDARD_IA \
        --metadata "timestamp=${TIMESTAMP},retention-days=${RETENTION_DAYS}"; then
        log "Backup uploaded to S3: s3://${S3_BUCKET}/${s3_key}"

        # Set lifecycle policy for automatic deletion
        aws s3api put-object-tagging \
            --bucket "$S3_BUCKET" \
            --key "$s3_key" \
            --tagging "TagSet=[{Key=backup-type,Value=database},{Key=retention-days,Value=${RETENTION_DAYS}}]" \
            2>/dev/null || warn "Failed to set S3 object tags"

        return 0
    else
        error "Failed to upload backup to S3"
        return 1
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."

    # Clean local backups
    local deleted_count=0
    while IFS= read -r -d '' file; do
        rm "$file"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "upc_resolver_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -print0 2>/dev/null)

    if [[ $deleted_count -gt 0 ]]; then
        log "Deleted $deleted_count old local backup(s)"
    fi

    # Clean S3 backups if configured
    if [[ -n "$S3_BUCKET" ]]; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
        aws s3api list-objects-v2 \
            --bucket "$S3_BUCKET" \
            --prefix "database-backups/" \
            --query "Contents[?LastModified<='${cutoff_date}'].Key" \
            --output text 2>/dev/null | while read -r key; do
            if [[ -n "$key" && "$key" != "None" ]]; then
                aws s3 rm "s3://${S3_BUCKET}/${key}" 2>/dev/null && \
                    log "Deleted old S3 backup: $key"
            fi
        done
    fi
}

# Get backup statistics
get_backup_stats() {
    local backup_file="$1"

    if [[ -f "$backup_file" ]]; then
        local size=$(du -h "$backup_file" | cut -f1)
        local lines=$(zcat "$backup_file" 2>/dev/null | wc -l || echo "unknown")

        log "Backup statistics:"
        log "  File: $(basename "$backup_file")"
        log "  Size: $size"
        log "  Lines: $lines"

        echo "Backup completed successfully. Size: $size, Lines: $lines"
    else
        error "Backup file not found: $backup_file"
        return 1
    fi
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"

    log "Verifying backup integrity..."

    # Check if file is a valid gzip file
    if ! gzip -t "$backup_file" 2>/dev/null; then
        error "Backup file is corrupted (invalid gzip)"
        return 1
    fi

    # Check if backup contains SQL data
    if ! zcat "$backup_file" 2>/dev/null | head -20 | grep -q "PostgreSQL database dump"; then
        error "Backup file does not appear to contain PostgreSQL dump data"
        return 1
    fi

    log "Backup integrity verification passed"
    return 0
}

# Main backup process
main() {
    local start_time=$(date +%s)

    log "=== UPC Resolver Database Backup Started ==="
    log "Timestamp: $TIMESTAMP"
    log "Backup directory: $BACKUP_DIR"
    log "Retention period: $RETENTION_DAYS days"

    # Check prerequisites
    check_prerequisites

    # Create backup
    local backup_file
    if backup_file=$(create_backup); then
        # Verify backup
        if verify_backup "$backup_file"; then
            # Upload to S3
            upload_to_s3 "$backup_file"

            # Get statistics
            local stats
            stats=$(get_backup_stats "$backup_file")

            # Clean up old backups
            cleanup_old_backups

            local end_time=$(date +%s)
            local duration=$((end_time - start_time))

            log "=== Backup completed successfully in ${duration}s ==="
            send_slack_notification "success" "$stats"

            exit 0
        else
            error "Backup verification failed"
            send_slack_notification "error" "Backup verification failed for $BACKUP_NAME"
            exit 1
        fi
    else
        error "Backup creation failed"
        send_slack_notification "error" "Backup creation failed for $BACKUP_NAME"
        exit 1
    fi
}

# Handle script interruption
trap 'error "Backup interrupted"; send_slack_notification "error" "Backup process was interrupted"; exit 1' INT TERM

# Run main function
main "$@"