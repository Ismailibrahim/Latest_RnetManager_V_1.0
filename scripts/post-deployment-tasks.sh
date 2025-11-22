#!/bin/bash

# Post-Deployment Tasks Script
# Run after successful deployment to optimize and verify

set -e

APP_DIR="${APP_DIRECTORY:-/var/www/webapp}"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

log "🎉 Running post-deployment optimization tasks..."

# Backend optimizations
if [ -d "$BACKEND_DIR" ]; then
    cd "$BACKEND_DIR"
    
    log_info "Clearing application cache..."
    php artisan cache:clear || true
    
    log_info "Warming up cache..."
    php artisan config:cache || true
    php artisan route:cache || true
    php artisan view:cache || true
    
    log_info "Optimizing autoloader..."
    composer dump-autoload --optimize --no-dev || true
    
    log "✅ Backend optimizations complete"
fi

# Frontend optimizations
if [ -d "$FRONTEND_DIR" ]; then
    cd "$FRONTEND_DIR"
    
    log_info "Verifying frontend build..."
    if [ -d ".next" ]; then
        log "✅ Frontend build verified"
    else
        log_warning "Frontend build directory not found"
    fi
fi

# Restart services gracefully
log_info "Restarting services..."
sudo systemctl reload nginx || true
sudo systemctl reload php8.2-fpm || sudo systemctl reload php8.3-fpm || true

if command -v pm2 &> /dev/null; then
    pm2 reload rentapp-frontend || pm2 restart rentapp-frontend || true
fi

log "✅ Post-deployment tasks complete!"

