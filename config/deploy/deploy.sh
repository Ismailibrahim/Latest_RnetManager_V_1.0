#!/bin/bash

# RentApplication Deployment Script
# This script should be placed at: /var/www/webapp/deploy.sh
# Make it executable: chmod +x /var/www/webapp/deploy.sh

set -e  # Exit on any error

APP_DIR="${APP_DIRECTORY:-/var/www/webapp}"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
ENVIRONMENT="${DEPLOY_ENV:-production}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Error handler
error_handler() {
    log_error "Deployment failed at line $1"
    log_error "Check the logs above for details"
    exit 1
}

trap 'error_handler $LINENO' ERR

log "🚀 Starting deployment (Environment: $ENVIRONMENT)..."

# Pre-deployment checks
log_info "🔍 Running pre-deployment checks..."

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    log_error "Cannot access $APP_DIR"
    exit 1
fi

# Check disk space (at least 500MB free)
AVAILABLE_KB=$(df "$APP_DIR" | tail -1 | awk '{print $4}')
if [ "$AVAILABLE_KB" -lt 512000 ]; then
    log_warning "Low disk space: $(($AVAILABLE_KB / 1024))MB free (recommended: at least 500MB)"
fi

# Check required commands
for cmd in git composer php npm; do
    if ! command -v $cmd &> /dev/null; then
        log_error "$cmd is not installed or not in PATH"
        exit 1
    fi
done

# Check PHP version (should be 8.2+)
PHP_MAJOR=$(php -r 'echo PHP_MAJOR_VERSION;')
PHP_MINOR=$(php -r 'echo PHP_MINOR_VERSION;')
PHP_VERSION="$PHP_MAJOR.$PHP_MINOR"
if [ "$PHP_MAJOR" -lt 8 ] || ([ "$PHP_MAJOR" -eq 8 ] && [ "$PHP_MINOR" -lt 2 ]); then
    log_warning "PHP version $PHP_VERSION is below recommended 8.2+"
fi

log "✅ Pre-deployment checks passed"

# Navigate to app directory
cd "$APP_DIR" || {
    log_error "Cannot access $APP_DIR"
    exit 1
}

# Pull latest code
log_info "📥 Pulling latest code from main branch..."
if ! git fetch --all; then
    log_error "Failed to fetch from git"
    exit 1
fi

if ! git reset --hard origin/main; then
    log_error "Failed to reset to origin/main"
    exit 1
fi

COMMIT_HASH=$(git rev-parse --short HEAD)
log "✅ Code updated to commit: $COMMIT_HASH"

# Backend setup
if [ -d "$BACKEND_DIR" ]; then
    log_info "📦 Setting up backend..."
    cd "$BACKEND_DIR"
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        log_warning ".env file not found, creating from .env.example if available"
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_warning "Please update .env with your production settings!"
        else
            log_error ".env file not found and no .env.example available"
            exit 1
        fi
    fi
    
    # Install dependencies
    log_info "Installing PHP dependencies..."
    if ! composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev; then
        log_error "Composer install failed"
        exit 1
    fi
    
    # Run migrations
    log_info "Running database migrations..."
    if ! php artisan migrate --force; then
        log_error "Database migrations failed"
        exit 1
    fi
    
    # Clear and cache config
    log_info "Caching configuration..."
    php artisan config:clear || true
    php artisan config:cache || {
        log_warning "Config cache failed, continuing..."
    }
    
    # Cache routes
    php artisan route:clear || true
    php artisan route:cache || {
        log_warning "Route cache failed, continuing..."
    }
    
    # Cache views
    php artisan view:clear || true
    php artisan view:cache || {
        log_warning "View cache failed, continuing..."
    }
    
    # Optimize
    php artisan optimize || {
        log_warning "Optimize failed, continuing..."
    }
    
    # Create storage link for public file access
    log_info "Creating storage symlink..."
    php artisan storage:link || {
        log_warning "Storage link already exists or failed"
    }
    
    # Set proper permissions
    log_info "Setting storage permissions..."
    chmod -R 775 storage bootstrap/cache 2>/dev/null || true
    chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true
    
    log "✅ Backend setup complete"
else
    log_error "Backend directory not found: $BACKEND_DIR"
    exit 1
fi

# Frontend setup
if [ -d "$FRONTEND_DIR" ]; then
    log_info "🎨 Setting up frontend..."
    cd "$FRONTEND_DIR"
    
    # Check if .env.local exists
    if [ ! -f ".env.local" ] && [ -f ".env.example" ]; then
        log_warning ".env.local not found, creating from .env.example"
        cp .env.example .env.local
    fi
    
    # Install dependencies
    log_info "Installing Node dependencies..."
    if ! npm ci; then
        log_error "npm ci failed"
        exit 1
    fi
    
    # Build for production
    log_info "Building frontend for production..."
    if ! npm run build; then
        log_error "Frontend build failed"
        exit 1
    fi
    
    log "✅ Frontend setup complete"
else
    log_error "Frontend directory not found: $FRONTEND_DIR"
    exit 1
fi

# Restart services (optional - uncomment if needed)
# log_info "🔄 Restarting services..."
# sudo systemctl restart nginx || true
# sudo systemctl restart php8.2-fpm || sudo systemctl restart php8.3-fpm || true

# Health check
log_info "🏥 Running post-deployment health check..."
cd "$BACKEND_DIR"
if php artisan route:list 2>/dev/null | grep -q "api/v1/health\|api.health"; then
    log "✅ Health endpoint route found"
else
    log_warning "Health endpoint route check skipped (routes may not be loaded)"
fi

log "✅ Deployment complete!"
log "📊 Deployment Summary:"
log "   - Environment: $ENVIRONMENT"
log "   - Commit: $COMMIT_HASH"
log "   - Backend: ✅"
log "   - Frontend: ✅"
log "   - Timestamp: $(date)"

