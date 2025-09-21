#!/bin/bash

# Database Restore Script for UPC Conflict Resolver
# This script restores database from backup with safety checks

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
S3_BUCKET="${S3_BACKUP_BUCKET:-upc-resolver-backups}"
RESTORE_CONFIRM="${RESTORE_CONFIRM:-false}"

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

# Show usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS] <backup_file_or_s3_key>

Restore database from backup file.

OPTIONS:
    -h, --help          Show this help message
    -y, --yes           Skip confirmation prompt
    -s, --from-s3       Restore from S3 backup
    -l, --list          List available backups
    --dry-run          Show what would be restored without actually doing it

EXAMPLES:
    $0 upc_resolver_backup_20231215_143022.sql.gz
    $0 --from-s3 database-backups/upc_resolver_backup_20231215_143022.sql.gz
    $0 --list
    $0 --dry-run backup_file.sql.gz

ENVIRONMENT VARIABLES:
    DATABASE_URL        PostgreSQL connection string
    BACKUP_DIR          Local backup directory (default: /app/backups)
    S3_BACKUP_BUCKET    S3 bucket name for backups
    RESTORE_CONFIRM     Set to 'true' to skip confirmation (default: false)
EOF
}

# List available backups
list_backups() {
    log "Available local backups:"
    if ls "${BACKUP_DIR}"/upc_resolver_backup_*.sql.gz 2>/dev/null; then
        echo
        log "Backup details:"
        for file in "${BACKUP_DIR}"/upc_resolver_backup_*.sql.gz; do
            if [[ -f "$file" ]]; then
                local size=$(du -h "$file" | cut -f1)
                local date=$(stat -c %y "$file" | cut -d' ' -f1,2 | cut -d'.' -f1)
                info "  $(basename "$file") - Size: $size, Created: $date"
            fi
        done
    else
        warn "No local backups found in $BACKUP_DIR"
    fi

    echo
    if [[ -n "${S3_BUCKET:-}" ]] && command -v aws &> /dev/null; then
        log "Available S3 backups:"
        aws s3 ls "s3://${S3_BUCKET}/database-backups/" --human-readable --summarize 2>/dev/null || \
            warn "Failed to list S3 backups or none found"
    else
        warn "S3 not configured or AWS CLI not available"
    fi
}

# Download backup from S3
download_from_s3() {
    local s3_key="$1"
    local local_file="${BACKUP_DIR}/$(basename "$s3_key")"

    if [[ -z "$S3_BUCKET" ]]; then
        error "S3_BACKUP_BUCKET not configured"
        return 1
    fi

    log "Downloading backup from S3..."
    if aws s3 cp "s3://${S3_BUCKET}/${s3_key}" "$local_file"; then
        log "Downloaded backup to: $local_file"
        echo "$local_file"
    else
        error "Failed to download backup from S3"
        return 1
    fi
}

# Verify backup file
verify_backup_file() {
    local backup_file="$1"

    log "Verifying backup file: $(basename "$backup_file")"

    # Check if file exists
    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
        return 1
    fi

    # Check if file is readable
    if [[ ! -r "$backup_file" ]]; then
        error "Backup file is not readable: $backup_file"
        return 1
    fi

    # Check if file is a valid gzip file
    if ! gzip -t "$backup_file" 2>/dev/null; then
        error "Backup file is corrupted (invalid gzip): $backup_file"
        return 1
    fi

    # Check if backup contains SQL data
    if ! zcat "$backup_file" 2>/dev/null | head -20 | grep -q "PostgreSQL database dump"; then
        error "Backup file does not appear to contain PostgreSQL dump data"
        return 1
    fi

    # Get file stats
    local size=$(du -h "$backup_file" | cut -f1)
    local lines=$(zcat "$backup_file" 2>/dev/null | wc -l)

    log "Backup verification passed:"
    log "  File: $(basename "$backup_file")"
    log "  Size: $size"
    log "  Lines: $lines"

    return 0
}

# Create pre-restore backup
create_pre_restore_backup() {
    log "Creating pre-restore backup of current database..."

    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_name="pre_restore_backup_${timestamp}"
    local backup_file="${BACKUP_DIR}/${backup_name}.sql"

    if pg_dump "$DATABASE_URL" --no-password --verbose --clean --no-acl --no-owner > "$backup_file" 2>/dev/null; then
        if gzip "$backup_file"; then
            log "Pre-restore backup created: ${backup_file}.gz"
            echo "${backup_file}.gz"
        else
            error "Failed to compress pre-restore backup"
            return 1
        fi
    else
        error "Failed to create pre-restore backup"
        return 1
    fi
}

# Get database info
get_database_info() {
    log "Current database information:"

    # Get database name from URL
    local db_name
    db_name=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

    # Get table count and row estimates
    local table_info
    table_info=$(psql "$DATABASE_URL" -t -c "
        SELECT
            schemaname,
            tablename,
            n_tup_ins - n_tup_del as estimated_rows
        FROM pg_stat_user_tables
        ORDER BY estimated_rows DESC
        LIMIT 10;" 2>/dev/null || echo "Unable to query database")

    info "  Database: $db_name"
    if [[ "$table_info" != "Unable to query database" ]]; then
        info "  Top tables by estimated row count:"
        echo "$table_info" | while read -r line; do
            if [[ -n "$line" && "$line" != " " ]]; then
                info "    $line"
            fi
        done
    else
        warn "  Could not retrieve table information"
    fi
}

# Restore database
restore_database() {
    local backup_file="$1"
    local pre_restore_backup="$2"

    log "Starting database restore..."

    # Drop and recreate database (if using separate database)
    local db_name
    db_name=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

    log "Restoring from backup: $(basename "$backup_file")"

    # Restore the database
    if zcat "$backup_file" | psql "$DATABASE_URL" -v ON_ERROR_STOP=1 2>/dev/null; then
        log "Database restore completed successfully"

        # Verify restore by checking if tables exist
        local table_count
        table_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")

        log "Restore verification:"
        log "  Tables created: $table_count"

        if [[ "$table_count" -gt 0 ]]; then
            log "Database restore verified successfully"
            return 0
        else
            error "Restore verification failed: No tables found"
            return 1
        fi
    else
        error "Database restore failed"

        # Offer to restore pre-restore backup
        if [[ -n "$pre_restore_backup" ]]; then
            warn "Would you like to restore the pre-restore backup? (y/N)"
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                log "Restoring pre-restore backup..."
                zcat "$pre_restore_backup" | psql "$DATABASE_URL" -v ON_ERROR_STOP=1
                log "Pre-restore backup restored"
            fi
        fi

        return 1
    fi
}

# Main restore process
main() {
    local backup_source=""
    local from_s3=false
    local list_only=false
    local dry_run=false
    local skip_confirm=false

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -y|--yes)
                skip_confirm=true
                shift
                ;;
            -s|--from-s3)
                from_s3=true
                shift
                ;;
            -l|--list)
                list_only=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            -*)
                error "Unknown option: $1"
                usage
                exit 1
                ;;
            *)
                if [[ -z "$backup_source" ]]; then
                    backup_source="$1"
                else
                    error "Too many arguments"
                    usage
                    exit 1
                fi
                shift
                ;;
        esac
    done

    # Handle list command
    if [[ "$list_only" == true ]]; then
        list_backups
        exit 0
    fi

    # Check if backup source is provided
    if [[ -z "$backup_source" ]]; then
        error "Backup file or S3 key is required"
        usage
        exit 1
    fi

    # Check prerequisites
    if [[ -z "${DATABASE_URL:-}" ]]; then
        error "DATABASE_URL environment variable is not set"
        exit 1
    fi

    if ! command -v psql &> /dev/null; then
        error "psql could not be found. Please install PostgreSQL client tools."
        exit 1
    fi

    if [[ "$from_s3" == true ]] && ! command -v aws &> /dev/null; then
        error "AWS CLI not found but --from-s3 specified"
        exit 1
    fi

    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    log "=== UPC Resolver Database Restore Started ==="

    # Determine backup file location
    local backup_file
    if [[ "$from_s3" == true ]]; then
        backup_file=$(download_from_s3 "$backup_source")
    else
        if [[ "$backup_source" =~ ^/ ]]; then
            # Absolute path
            backup_file="$backup_source"
        else
            # Relative path, assume it's in backup directory
            backup_file="${BACKUP_DIR}/${backup_source}"
        fi
    fi

    # Verify backup file
    if ! verify_backup_file "$backup_file"; then
        exit 1
    fi

    if [[ "$dry_run" == true ]]; then
        log "DRY RUN: Would restore from $backup_file"
        log "DRY RUN: Current database would be backed up before restore"
        exit 0
    fi

    # Show current database info
    get_database_info

    # Confirmation
    if [[ "$skip_confirm" != true && "$RESTORE_CONFIRM" != true ]]; then
        echo
        warn "This will REPLACE the current database with the backup!"
        warn "Current data will be lost unless you have a backup!"
        echo
        info "Backup file: $(basename "$backup_file")"
        echo
        read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

        if [[ "$confirm" != "yes" ]]; then
            log "Restore cancelled by user"
            exit 0
        fi
    fi

    # Create pre-restore backup
    local pre_restore_backup
    pre_restore_backup=$(create_pre_restore_backup)

    # Perform restore
    if restore_database "$backup_file" "$pre_restore_backup"; then
        log "=== Database restore completed successfully ==="

        # Show new database info
        echo
        get_database_info

        log "Pre-restore backup saved as: $(basename "$pre_restore_backup")"
        exit 0
    else
        error "=== Database restore failed ==="
        exit 1
    fi
}

# Handle script interruption
trap 'error "Restore interrupted"; exit 1' INT TERM

# Run main function
main "$@"