#!/bin/bash

# Rollback Script
# This script helps rollback to a previous deployment backup

# Don't use set -e here as we want to handle errors gracefully
set +e

APP_DIR="${APP_DIRECTORY:-/var/www/webapp}"
BACKUP_DIR="$APP_DIR/backups"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    log_error "Backup directory not found: $BACKUP_DIR"
    exit 1
fi

# List available backups
echo "📦 Available backups:"
echo ""
BACKUPS=($(ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -10))

if [ ${#BACKUPS[@]} -eq 0 ]; then
    log_error "No backups found in $BACKUP_DIR"
    exit 1
fi

# Display backups
for i in "${!BACKUPS[@]}"; do
    BACKUP_FILE="${BACKUPS[$i]}"
    BACKUP_NAME=$(basename "$BACKUP_FILE")
    BACKUP_DATE=$(echo "$BACKUP_NAME" | grep -oE '[0-9]{8}_[0-9]{6}' || echo "unknown")
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "  $((i+1)). $BACKUP_NAME ($BACKUP_SIZE) - $BACKUP_DATE"
done

echo ""
read -p "Enter backup number to restore (1-${#BACKUPS[@]}): " SELECTION

if ! [[ "$SELECTION" =~ ^[0-9]+$ ]] || [ "$SELECTION" -lt 1 ] || [ "$SELECTION" -gt ${#BACKUPS[@]} ]; then
    log_error "Invalid selection"
    exit 1
fi

SELECTED_BACKUP="${BACKUPS[$((SELECTION-1))]}"
SELECTED_NAME=$(basename "$SELECTED_BACKUP")

log_warning "This will restore from: $SELECTED_NAME"
log_warning "Current deployment will be backed up first"
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log "Rollback cancelled"
    exit 0
fi

# Create backup of current state
log "💾 Creating backup of current state..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cd "$APP_DIR"
tar -czf "$BACKUP_DIR/pre_rollback_$TIMESTAMP.tar.gz" \
    --exclude="$APP_DIR/backups" \
    --exclude="$APP_DIR/node_modules" \
    --exclude="$APP_DIR/backend/vendor" \
    --exclude="$APP_DIR/backend/storage/logs/*" \
    --exclude="$APP_DIR/frontend/.next" \
    . 2>/dev/null || true

# Extract backup
log "📦 Extracting backup: $SELECTED_NAME"
cd "$APP_DIR"
tar -xzf "$SELECTED_BACKUP" || {
    log_error "Failed to extract backup"
    exit 1
}

# Run post-rollback tasks
log "🔄 Running post-rollback tasks..."

# Backend
if [ -d "$APP_DIR/backend" ]; then
    cd "$APP_DIR/backend"
    log "📦 Updating backend dependencies..."
    composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev || true
    
    log "🗄️  Running migrations..."
    php artisan migrate --force || true
    
    log "⚙️  Optimizing..."
    php artisan config:cache || true
    php artisan route:cache || true
    php artisan view:cache || true
    php artisan optimize || true
fi

# Frontend
if [ -d "$APP_DIR/frontend" ]; then
    cd "$APP_DIR/frontend"
    log "🎨 Rebuilding frontend..."
    npm ci || true
    npm run build || true
fi

log "✅ Rollback complete!"
log "📊 Rolled back to: $SELECTED_NAME"
log "💾 Current state backed up as: pre_rollback_$TIMESTAMP.tar.gz"

