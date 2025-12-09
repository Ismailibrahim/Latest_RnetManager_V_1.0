#!/bin/bash

# Quick Local Deployment Testing Script
# Tests deployment steps without actually deploying
# Run this before attempting production deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}✅${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

log_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

ERRORS=0
WARNINGS=0

echo ""
echo "🧪 Testing Deployment Guide Steps"
echo "=================================="
echo ""

# Test 1: Check if required files exist
log_info "Checking required files..."

if [ ! -f "DEPLOYMENT_GUIDE.md" ]; then
    log_error "DEPLOYMENT_GUIDE.md not found"
    ((ERRORS++))
else
    log "DEPLOYMENT_GUIDE.md exists"
fi

if [ ! -f "config/deploy/deploy.sh" ]; then
    log_error "config/deploy/deploy.sh not found"
    ((ERRORS++))
else
    log "Deployment script exists"
fi

if [ ! -f "docker-compose.yml" ]; then
    log_warning "docker-compose.yml not found (Docker testing not available)"
    ((WARNINGS++))
else
    log "docker-compose.yml exists"
fi

# Test 2: Check deployment script syntax
log_info "Checking deployment script syntax..."

if bash -n config/deploy/deploy.sh 2>/dev/null; then
    log "Deployment script syntax is valid"
else
    log_error "Deployment script has syntax errors"
    ((ERRORS++))
fi

# Test 3: Check if backend files exist
log_info "Checking backend structure..."

if [ ! -d "backend" ]; then
    log_error "backend/ directory not found"
    ((ERRORS++))
else
    log "backend/ directory exists"
    
    if [ ! -f "backend/composer.json" ]; then
        log_error "backend/composer.json not found"
        ((ERRORS++))
    else
        log "backend/composer.json exists"
    fi
    
    if [ ! -f "backend/.env.example" ] && [ ! -f "env/backend.env.example" ]; then
        log_warning "Backend .env.example not found"
        ((WARNINGS++))
    else
        log "Backend .env.example exists"
    fi
fi

# Test 4: Check if frontend files exist
log_info "Checking frontend structure..."

if [ ! -d "frontend" ]; then
    log_error "frontend/ directory not found"
    ((ERRORS++))
else
    log "frontend/ directory exists"
    
    if [ ! -f "frontend/package.json" ]; then
        log_error "frontend/package.json not found"
        ((ERRORS++))
    else
        log "frontend/package.json exists"
    fi
    
    if [ ! -f "frontend/.env.example" ] && [ ! -f "env/frontend.env.example" ]; then
        log_warning "Frontend .env.example not found"
        ((WARNINGS++))
    else
        log "Frontend .env.example exists"
    fi
fi

# Test 5: Check Docker setup (if available)
if [ -f "docker-compose.yml" ]; then
    log_info "Checking Docker setup..."
    
    if command -v docker &> /dev/null; then
        log "Docker is installed"
        
        if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
            log "Docker Compose is available"
        else
            log_warning "Docker Compose not found"
            ((WARNINGS++))
        fi
    else
        log_warning "Docker not installed (optional for testing)"
        ((WARNINGS++))
    fi
fi

# Test 6: Check deployment guide references
log_info "Checking deployment guide references..."

if grep -q "/var/www/rentapplicaiton" DEPLOYMENT_GUIDE.md 2>/dev/null; then
    log "Deployment guide uses correct folder name (rentapplicaiton)"
else
    log_warning "Deployment guide may not use correct folder name"
    ((WARNINGS++))
fi

# Test 7: Check for common issues
log_info "Checking for common issues..."

# Check if deploy.sh uses correct folder name
if grep -q "/var/www/webapp" config/deploy/deploy.sh 2>/dev/null; then
    log_warning "deploy.sh may still use old folder name (webapp)"
    log_info "Consider updating to /var/www/rentapplicaiton"
    ((WARNINGS++))
fi

# Summary
echo ""
echo "=================================="
echo "📊 Test Summary"
echo "=================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    log "All checks passed! ✅"
    echo ""
    log_info "You can proceed with testing deployment using:"
    echo "  1. Docker: docker-compose up -d"
    echo "  2. VM: Follow DEPLOYMENT_GUIDE.md"
    echo "  3. Staging: Set up staging server"
    echo ""
    log_info "See DEPLOYMENT_TESTING_GUIDE.md for detailed testing options"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    log_warning "Checks passed with $WARNINGS warning(s)"
    echo ""
    log_info "You can proceed, but consider addressing warnings"
    exit 0
else
    log_error "Found $ERRORS error(s) and $WARNINGS warning(s)"
    echo ""
    log_error "Please fix errors before deploying"
    exit 1
fi

