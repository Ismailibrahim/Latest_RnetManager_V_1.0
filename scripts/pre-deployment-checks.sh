#!/bin/bash

# Pre-Deployment Validation Script
# Run this before deploying to catch issues early

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

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

ERRORS=0
WARNINGS=0

log "🔍 Running pre-deployment validation checks..."

# Check if directories exist
if [ ! -d "$BACKEND_DIR" ]; then
    log_error "Backend directory not found: $BACKEND_DIR"
    ((ERRORS++))
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    log_error "Frontend directory not found: $FRONTEND_DIR"
    ((ERRORS++))
fi

# Check backend .env file
if [ -d "$BACKEND_DIR" ]; then
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        log_error "Backend .env file not found"
        ((ERRORS++))
    else
        # Check critical environment variables
        if ! grep -q "APP_KEY=" "$BACKEND_DIR/.env" || grep -q "APP_KEY=$" "$BACKEND_DIR/.env"; then
            log_error "APP_KEY not set in backend .env"
            ((ERRORS++))
        fi
        
        if ! grep -q "DB_DATABASE=" "$BACKEND_DIR/.env"; then
            log_error "DB_DATABASE not set in backend .env"
            ((ERRORS++))
        fi
        
        if ! grep -q "DB_USERNAME=" "$BACKEND_DIR/.env"; then
            log_error "DB_USERNAME not set in backend .env"
            ((ERRORS++))
        fi
    fi
fi

# Check frontend .env.local file
if [ -d "$FRONTEND_DIR" ]; then
    if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
        log_warning "Frontend .env.local not found (will be created from .env.example if available)"
        ((WARNINGS++))
    else
        if ! grep -q "NEXT_PUBLIC_API_URL=" "$FRONTEND_DIR/.env.local"; then
            log_warning "NEXT_PUBLIC_API_URL not set in frontend .env.local"
            ((WARNINGS++))
        fi
    fi
fi

# Check required commands
for cmd in git composer php npm; do
    if ! command -v $cmd &> /dev/null; then
        log_error "$cmd is not installed or not in PATH"
        ((ERRORS++))
    fi
done

# Check PHP version
if command -v php &> /dev/null; then
    PHP_MAJOR=$(php -r 'echo PHP_MAJOR_VERSION;')
    PHP_MINOR=$(php -r 'echo PHP_MINOR_VERSION;')
    if [ "$PHP_MAJOR" -lt 8 ] || ([ "$PHP_MAJOR" -eq 8 ] && [ "$PHP_MINOR" -lt 2 ]); then
        log_warning "PHP version $PHP_MAJOR.$PHP_MINOR is below recommended 8.2+"
        ((WARNINGS++))
    fi
fi

# Check Node version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_warning "Node.js version is below recommended 18+"
        ((WARNINGS++))
    fi
fi

# Check disk space
if [ -d "$APP_DIR" ]; then
    AVAILABLE_KB=$(df "$APP_DIR" | tail -1 | awk '{print $4}')
    if [ "$AVAILABLE_KB" -lt 512000 ]; then
        log_warning "Low disk space: $(($AVAILABLE_KB / 1024))MB free (recommended: at least 500MB)"
        ((WARNINGS++))
    fi
fi

# Check database connection
if [ -d "$BACKEND_DIR" ] && [ -f "$BACKEND_DIR/.env" ]; then
    log_info "Testing database connection..."
    cd "$BACKEND_DIR"
    if php artisan db:show &>/dev/null; then
        log "✅ Database connection successful"
    else
        log_error "Database connection failed"
        ((ERRORS++))
    fi
fi

# Check if services are running
if ! systemctl is-active --quiet nginx 2>/dev/null; then
    log_warning "Nginx is not running"
    ((WARNINGS++))
fi

if ! systemctl is-active --quiet php8.2-fpm 2>/dev/null && ! systemctl is-active --quiet php8.3-fpm 2>/dev/null; then
    log_warning "PHP-FPM is not running"
    ((WARNINGS++))
fi

# Summary
echo ""
log "📊 Validation Summary:"
log "   - Errors: $ERRORS"
log "   - Warnings: $WARNINGS"
echo ""

if [ $ERRORS -gt 0 ]; then
    log_error "❌ Pre-deployment checks failed with $ERRORS error(s)"
    log_error "Please fix the errors before deploying"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    log_warning "⚠️  Pre-deployment checks passed with $WARNINGS warning(s)"
    log "You can proceed with deployment, but consider addressing the warnings"
    exit 0
else
    log "✅ All pre-deployment checks passed!"
    exit 0
fi

