#git add .github/workflows/deploy.yml
**Date:** November 21, 2025  
**Status:** Implementation Ready

---

## Overview
This plan sets up automated deployment from GitHub to a VPS server using GitHub Actions. The deployment will handle Laravel backend (PHP-FPM), Next.js frontend (PM2), MySQL database, and Nginx reverse proxy - all without Docker.

## Architecture
- **Backend**: Laravel 12 served via PHP-FPM (port 8000)
- **Frontend**: Next.js 16 served via PM2 (port 3000)
- **Web Server**: Nginx reverse proxy (port 80)
- **Database**: MySQL
- **Deployment**: GitHub Actions → SSH → Automated deploy script

## Implementation Steps

### 1. Create GitHub Actions Workflow
**File**: `.github/workflows/deploy.yml`
- Trigger on push to `main` branch
- Use SSH action to connect to VPS
- Execute deployment script remotely
- Handle environment variables securely

### 2. Server Setup Script
**File**: `scripts/server-setup.sh` (committed)
- Install all dependencies (PHP 8.2+, Node.js 18+, MySQL, Nginx, Composer, PM2)
- Create application directory structure
- Set up database
- Configure systemd services
- Set proper file permissions

### 3. Enhanced Deployment Script
**File**: `config/deploy/deploy.sh` (update existing)
- Pull latest code from GitHub
- Install/update backend dependencies (Composer)
- Run database migrations
- Build and optimize Laravel (cache config, routes, views)
- Install/update frontend dependencies (npm)
- Build Next.js for production
- Restart services (PHP-FPM, PM2, Nginx)
- Health checks

### 4. Next.js Configuration Update
**File**: `frontend/next.config.mjs`
- Enable `output: 'standalone'` for optimized production builds
- Ensure proper production settings

### 5. PM2 Ecosystem Configuration
**File**: `ecosystem.config.js` (root)
- PM2 configuration for Next.js process
- Auto-restart on failure
- Production environment settings

### 6. Nginx Configuration
**File**: `config/nginx/rentapp.conf` (update existing)
- Reverse proxy for `/api/*` → Laravel backend (PHP-FPM)
- Reverse proxy for `/` → Next.js frontend (PM2 on port 3000)
- Static file serving for Next.js assets
- Proper headers for CORS and security
- Gzip compression

### 7. Environment Setup Documentation
**File**: `documents/DEPLOYMENT_GITHUB_ACTIONS.md`
- Step-by-step guide for initial server setup
- GitHub Secrets configuration
- First-time deployment instructions
- Troubleshooting guide

### 8. Supervisor Alternative (Optional)
**File**: `config/supervisor/rentapp-frontend.conf`
- Alternative to PM2 using Supervisor for process management
- Systemd service configuration

## Key Features
- **Zero-downtime deployment**: PM2 allows graceful restarts
- **Automatic dependency management**: Composer and npm handled automatically
- **Database migrations**: Run automatically on each deployment
- **Health checks**: Verify deployment success
- **Rollback capability**: Git-based rollback if needed
- **Security**: Environment variables in GitHub Secrets
- **Monitoring**: PM2 provides process monitoring

## Deployment Flow
1. Developer pushes to `main` branch
2. GitHub Actions workflow triggers
3. SSH into VPS using secrets
4. Run deployment script:
   - Pull latest code
   - Install dependencies
   - Run migrations
   - Build frontend
   - Restart services
5. Health check verification
6. Deployment complete

## Files to Create/Modify
- `.github/workflows/deploy.yml` (✅ committed)
- `scripts/server-setup.sh` (✅ committed)
- `config/deploy/deploy.sh` (update)
- `frontend/next.config.mjs` (update)
- `ecosystem.config.js` (✅ committed)
- `config/nginx/rentapp.conf` (update)
- `documents/DEPLOYMENT_GITHUB_ACTIONS.md` (✅ committed)
- `config/supervisor/rentapp-frontend.conf` (optional, ✅ committed)

## Dependencies Handled
- PHP 8.2+ and extensions (fpm, mysql, xml, mbstring, curl, zip)
- Composer (PHP package manager)
- Node.js 18+ and npm
- PM2 (Node process manager)
- MySQL server
- Nginx web server
- Git
- All Laravel dependencies via Composer
- All Next.js dependencies via npm

## Server Requirements
- Ubuntu 20.04+ or Debian 11+ (recommended)
- Minimum 2GB RAM
- Minimum 20GB storage
- Root or sudo access
- Public IP address or domain name

## Security Considerations
- SSH key-based authentication
- Environment variables stored in GitHub Secrets
- `.env` files not committed to repository
- Nginx security headers
- PHP-FPM security settings
- Database user with limited privileges

## Next Steps
1. Review and approve this plan
2. Set up VPS server
3. Configure GitHub Secrets
4. Run initial server setup script
5. Test first deployment
6. Configure domain and SSL (Let's Encrypt)

---

**Created:** November 21, 2025  
**Last Updated:** November 21, 2025

