#!/bin/bash

# Database Backup Script
# This script creates automated database backups

set -e

APP_DIR="${APP_DIRECTORY:-/var/www/webapp}"
BACKEND_DIR="$APP_DIR/backend"
BACKUP_DIR="$APP_DIR/backups/database"
RETENTION_DAYS=30

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

# Load database credentials from .env
if [ ! -f "$BACKEND_DIR/.env" ]; then
    log_error ".env file not found: $BACKEND_DIR/.env"
    exit 1
fi

source <(grep -E '^DB_' "$BACKEND_DIR/.env" | sed 's/^/export /')

# Set defaults if not set
DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-3306}
DB_DATABASE=${DB_DATABASE:-rentapp}
DB_USERNAME=${DB_USERNAME:-root}
DB_PASSWORD=${DB_PASSWORD:-}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_${DB_DATABASE}_${TIMESTAMP}.sql.gz"

log "📦 Creating database backup..."
log "   Database: $DB_DATABASE"
log "   Host: $DB_HOST"
log "   Backup file: $BACKUP_FILE"

# Create backup
if [ -z "$DB_PASSWORD" ]; then
    mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" \
        --single-transaction \
        --quick \
        --lock-tables=false \
        "$DB_DATABASE" | gzip > "$BACKUP_FILE"
else
    mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" -p"$DB_PASSWORD" \
        --single-transaction \
        --quick \
        --lock-tables=false \
        "$DB_DATABASE" | gzip > "$BACKUP_FILE"
fi

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "✅ Backup created successfully: $BACKUP_SIZE"
else
    log_error "Backup failed!"
    exit 1
fi

# Clean up old backups
log "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "backup_${DB_DATABASE}_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
log "✅ Cleanup complete"

# List current backups
log ""
log "📋 Current backups:"
ls -lh "$BACKUP_DIR"/backup_${DB_DATABASE}_*.sql.gz 2>/dev/null | tail -5 || log "No backups found"

log ""
log "✅ Database backup complete!"

