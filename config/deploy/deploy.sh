#!/bin/bash

# RentApplication Deployment Script
# This script should be placed at: /var/www/webapp/deploy.sh
# Make it executable: chmod +x /var/www/webapp/deploy.sh

set -e  # Exit on any error

APP_DIR="${APP_DIRECTORY:-/var/www/webapp}"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting deployment...${NC}"

# Navigate to app directory
cd "$APP_DIR" || {
    echo -e "${RED}❌ Error: Cannot access $APP_DIR${NC}"
    exit 1
}

# Pull latest code
echo -e "${YELLOW}📥 Pulling latest code...${NC}"
git fetch --all
git reset --hard origin/main

# Backend setup
if [ -d "$BACKEND_DIR" ]; then
    echo -e "${YELLOW}📦 Setting up backend...${NC}"
    cd "$BACKEND_DIR"
    
    # Install dependencies
    composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev
    
    # Run migrations
    php artisan migrate --force
    
    # Clear and cache config
    php artisan config:clear
    php artisan config:cache
    
    # Cache routes
    php artisan route:clear
    php artisan route:cache
    
    # Cache views
    php artisan view:clear
    php artisan view:cache
    
    # Optimize
    php artisan optimize
    
    echo -e "${GREEN}✅ Backend setup complete${NC}"
else
    echo -e "${RED}❌ Backend directory not found: $BACKEND_DIR${NC}"
    exit 1
fi

# Frontend setup
if [ -d "$FRONTEND_DIR" ]; then
    echo -e "${YELLOW}🎨 Setting up frontend...${NC}"
    cd "$FRONTEND_DIR"
    
    # Install dependencies
    npm ci
    
    # Build for production
    npm run build
    
    echo -e "${GREEN}✅ Frontend setup complete${NC}"
else
    echo -e "${RED}❌ Frontend directory not found: $FRONTEND_DIR${NC}"
    exit 1
fi

# Restart services (optional - uncomment if needed)
# echo -e "${YELLOW}🔄 Restarting services...${NC}"
# sudo systemctl restart nginx || true
# sudo systemctl restart php8.2-fpm || sudo systemctl restart php8.3-fpm || true

echo -e "${GREEN}✅ Deployment complete!${NC}"

