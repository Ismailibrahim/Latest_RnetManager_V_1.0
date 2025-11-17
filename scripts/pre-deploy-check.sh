#!/bin/bash

# Pre-Deployment Validation Script
# This script validates the environment before deployment

set -e

APP_DIR="${APP_DIRECTORY:-/var/www/webapp}"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅${NC} $1"
    else
        echo -e "${RED}❌${NC} $1"
        ERRORS=$((ERRORS + 1))
    fi
}

warn() {
    echo -e "${YELLOW}⚠️${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

echo "🔍 Running pre-deployment validation..."
echo ""

# Check directories
echo "📂 Checking directories..."
[ -d "$APP_DIR" ] && check "App directory exists: $APP_DIR" || check "App directory exists: $APP_DIR"
[ -d "$BACKEND_DIR" ] && check "Backend directory exists" || check "Backend directory exists"
[ -d "$FRONTEND_DIR" ] && check "Frontend directory exists" || check "Frontend directory exists"
echo ""

# Check required commands
echo "🛠️  Checking required commands..."
for cmd in git composer php npm node; do
    if command -v $cmd &> /dev/null; then
        VERSION=$($cmd --version 2>/dev/null | head -n1)
        check "$cmd is installed ($VERSION)"
    else
        check "$cmd is installed"
    fi
done
echo ""

# Check PHP version
echo "🐘 Checking PHP..."
PHP_VERSION=$(php -r 'echo PHP_VERSION;')
PHP_MAJOR=$(php -r 'echo PHP_MAJOR_VERSION;')
PHP_MINOR=$(php -r 'echo PHP_MINOR_VERSION;')
check "PHP version: $PHP_VERSION"
if [ "$PHP_MAJOR" -lt 8 ] || ([ "$PHP_MAJOR" -eq 8 ] && [ "$PHP_MINOR" -lt 2 ]); then
    warn "PHP version should be 8.2 or higher"
fi

# Check PHP extensions
REQUIRED_EXTENSIONS=("pdo" "pdo_mysql" "mbstring" "xml" "curl" "zip")
for ext in "${REQUIRED_EXTENSIONS[@]}"; do
    if php -m | grep -q "^$ext$"; then
        check "PHP extension: $ext"
    else
        check "PHP extension: $ext"
    fi
done
echo ""

# Check Node version
echo "📦 Checking Node.js..."
NODE_VERSION=$(node --version)
NODE_MAJOR=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
check "Node.js version: $NODE_VERSION"
if [ "$NODE_MAJOR" -lt 18 ]; then
    warn "Node.js version should be 18 or higher"
fi
echo ""

# Check disk space
echo "💾 Checking disk space..."
AVAILABLE_KB=$(df "$APP_DIR" 2>/dev/null | tail -1 | awk '{print $4}' || echo "0")
AVAILABLE_MB=$((AVAILABLE_KB / 1024))
if [ "$AVAILABLE_KB" -gt 1048576 ]; then
    check "Disk space: ${AVAILABLE_MB}MB free (OK)"
elif [ "$AVAILABLE_KB" -gt 524288 ]; then
    warn "Disk space: ${AVAILABLE_MB}MB free (Low, but acceptable)"
else
    warn "Disk space: ${AVAILABLE_MB}MB free (Very low!)"
fi
echo ""

# Check backend environment
echo "🔧 Checking backend environment..."
if [ -f "$BACKEND_DIR/.env" ]; then
    check "Backend .env file exists"
    
    # Check critical variables
    if grep -q "APP_KEY=" "$BACKEND_DIR/.env" && ! grep -q "APP_KEY=$" "$BACKEND_DIR/.env"; then
        check "APP_KEY is set"
    else
        warn "APP_KEY is not set (run: php artisan key:generate)"
    fi
    
    if grep -q "DB_DATABASE=" "$BACKEND_DIR/.env"; then
        DB_NAME=$(grep "DB_DATABASE=" "$BACKEND_DIR/.env" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
        check "DB_DATABASE is configured: $DB_NAME"
    else
        check "DB_DATABASE is configured"
    fi
else
    if [ -f "$BACKEND_DIR/.env.example" ]; then
        warn "Backend .env file not found (but .env.example exists)"
    else
        check "Backend .env file exists"
    fi
fi
echo ""

# Check frontend environment
echo "🎨 Checking frontend environment..."
if [ -f "$FRONTEND_DIR/.env.local" ] || [ -f "$FRONTEND_DIR/.env" ]; then
    check "Frontend environment file exists"
else
    if [ -f "$FRONTEND_DIR/.env.example" ]; then
        warn "Frontend environment file not found (but .env.example exists)"
    else
        check "Frontend environment file exists"
    fi
fi
echo ""

# Check database connectivity (if .env exists and vendor is installed)
if [ -f "$BACKEND_DIR/.env" ] && [ -d "$BACKEND_DIR/vendor" ]; then
    echo "🗄️  Checking database connectivity..."
    cd "$BACKEND_DIR"
    # Simple connection test using artisan
    if php artisan db:show &>/dev/null 2>&1 || php artisan migrate:status &>/dev/null 2>&1; then
        check "Database connection successful"
    else
        warn "Database connection test failed (check DB credentials in .env or ensure database exists)"
    fi
    echo ""
fi

# Check file permissions
echo "🔐 Checking file permissions..."
if [ -d "$BACKEND_DIR/storage" ]; then
    if [ -w "$BACKEND_DIR/storage" ]; then
        check "Backend storage is writable"
    else
        warn "Backend storage is not writable (run: chmod -R 775 storage)"
    fi
fi

if [ -d "$BACKEND_DIR/bootstrap/cache" ]; then
    if [ -w "$BACKEND_DIR/bootstrap/cache" ]; then
        check "Backend bootstrap/cache is writable"
    else
        warn "Backend bootstrap/cache is not writable (run: chmod -R 775 bootstrap/cache)"
    fi
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Validation Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
fi
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Errors: $ERRORS${NC}"
    echo ""
    echo "❌ Pre-deployment validation failed!"
    echo "Please fix the errors above before deploying."
    exit 1
else
    echo ""
    if [ $WARNINGS -gt 0 ]; then
        echo "⚠️  Pre-deployment validation passed with warnings."
        echo "Review the warnings above before deploying."
    else
        echo "✅ Pre-deployment validation passed!"
        echo "Ready to deploy."
    fi
    exit 0
fi

