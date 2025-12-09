# 🧪 Deployment Testing Guide

**Test your deployment process safely before going to production**

This guide provides multiple ways to test your deployment process without risking your production environment.

---

## 📋 Table of Contents

1. [Quick Testing Options](#quick-testing-options)
2. [Option 1: Docker Testing (Recommended)](#option-1-docker-testing-recommended)
3. [Option 2: Local VM Testing](#option-2-local-vm-testing)
4. [Option 3: Staging Server Testing](#option-3-staging-server-testing)
5. [Option 4: Component Testing](#option-4-component-testing)
6. [Pre-Deployment Validation](#pre-deployment-validation)
7. [Testing Checklist](#testing-checklist)

---

## Quick Testing Options

**Choose the best option for your situation:**

| Method | Difficulty | Time | Cost | Best For |
|--------|-----------|------|------|----------|
| **Docker** | ⭐ Easy | 15-30 min | Free | Quick local testing |
| **Local VM** | ⭐⭐ Medium | 1-2 hours | Free | Full production simulation |
| **Staging Server** | ⭐⭐ Medium | 30-60 min | $5-10/month | Pre-production validation |
| **Component Testing** | ⭐ Easy | 10-20 min | Free | Testing individual parts |

---

## Option 1: Docker Testing (Recommended)

**Best for:** Quick testing of the deployment process locally

### Prerequisites

- Docker Desktop installed (Windows/Mac) or Docker Engine (Linux)
- Docker Compose installed

### Step 1: Test with Docker Compose

```bash
# Navigate to project root
cd /path/to/RentApplicaiton

# Test production-like setup
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check if services are running
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 2: Test Backend

```bash
# Test backend API
curl http://localhost:8000/api/v1/health

# Test database connection
docker-compose exec backend php artisan migrate:status

# Test Laravel commands
docker-compose exec backend php artisan route:list
```

### Step 3: Test Frontend

```bash
# Check if frontend is running
curl http://localhost:3000

# Test API connection from frontend
# Open browser: http://localhost:3000
```

### Step 4: Test Deployment Script Logic

```bash
# Copy deployment script to test
cp config/deploy/deploy.sh /tmp/test-deploy.sh

# Modify APP_DIR for testing
sed -i 's|/var/www/webapp|/tmp/test-app|g' /tmp/test-deploy.sh

# Create test directory structure
mkdir -p /tmp/test-app/{backend,frontend}

# Test script (dry-run mode - modify script to add --dry-run flag)
# Review the script logic without executing
```

### Step 5: Clean Up

```bash
# Stop containers
docker-compose down

# Remove volumes (optional - removes data)
docker-compose down -v
```

### Advantages

✅ Fast setup (15-30 minutes)  
✅ No need for separate server  
✅ Isolated environment  
✅ Easy to reset and retry  
✅ Tests Docker deployment path  

### Limitations

⚠️ Not identical to production (different file paths, services)  
⚠️ Doesn't test Nginx configuration  
⚠️ Doesn't test systemd services  

---

## Option 2: Local VM Testing

**Best for:** Full production simulation on your local machine

### Prerequisites

- VirtualBox or VMware installed
- Ubuntu 20.04+ ISO downloaded
- At least 4GB RAM available for VM

### Step 1: Create Ubuntu VM

1. **Create new VM:**
   - Name: `RentApplicaiton-Test`
   - OS: Ubuntu 20.04 LTS
   - RAM: 2GB minimum (4GB recommended)
   - Disk: 20GB minimum
   - Network: NAT or Bridged

2. **Install Ubuntu:**
   - Follow standard Ubuntu installation
   - Create user account (remember username/password)
   - Enable SSH during installation

### Step 2: Follow Deployment Guide

**Use your VM as a test server:**

1. **Connect via SSH:**
   ```bash
   ssh your-username@VM_IP_ADDRESS
   ```

2. **Follow the deployment guide:**
   - Use `DEPLOYMENT_GUIDE.md` step-by-step
   - Use VM IP instead of production IP
   - Test all commands

3. **Test deployment script:**
   ```bash
   cd /var/www/rentapplicaiton
   ./deploy.sh
   ```

### Step 3: Test from Host Machine

```bash
# Test API from your host machine
curl http://VM_IP_ADDRESS/api/v1/health

# Test frontend
# Open browser: http://VM_IP_ADDRESS
```

### Advantages

✅ Identical to production environment  
✅ Tests all services (Nginx, PHP-FPM, MySQL)  
✅ Tests actual deployment script  
✅ Can test GitHub Actions deployment  
✅ Safe to experiment  

### Limitations

⚠️ Requires more resources (RAM, disk)  
⚠️ Takes longer to set up (1-2 hours)  
⚠️ Need to manage VM  

---

## Option 3: Staging Server Testing

**Best for:** Pre-production validation on real server

### Step 1: Set Up Staging Server

**Option A: Use a separate VPS**

1. Create a new VPS (smallest size is fine)
2. Use a subdomain: `staging.yourdomain.com`
3. Follow deployment guide on staging server

**Option B: Use same server, different directory**

```bash
# On production server, create staging directory
sudo mkdir -p /var/www/rentapplicaiton-staging
sudo chown -R $USER:$USER /var/www/rentapplicaiton-staging

# Clone repository to staging
cd /var/www/rentapplicaiton-staging
git clone https://github.com/YOUR_USERNAME/RentApplicaiton.git .

# Use different database
# Update .env with: DB_DATABASE=rentapp_staging
```

### Step 2: Test Deployment

```bash
# Test deployment script
cd /var/www/rentapplicaiton-staging
./deploy.sh

# Test API
curl http://staging.yourdomain.com/api/v1/health
```

### Step 3: Test GitHub Actions

1. **Create staging branch:**
   ```bash
   git checkout -b staging
   git push origin staging
   ```

2. **Update GitHub Actions workflow** to deploy staging branch to staging server

3. **Test automated deployment:**
   ```bash
   # Make a test change
   echo "# Test" >> README.md
   git add README.md
   git commit -m "Test staging deployment"
   git push origin staging
   ```

### Advantages

✅ Real server environment  
✅ Tests actual deployment process  
✅ Can test with real domain  
✅ Safe to experiment  
✅ Tests GitHub Actions  

### Limitations

⚠️ Costs money (if separate VPS)  
⚠️ Need to manage staging environment  

---

## Option 4: Component Testing

**Best for:** Testing individual parts of deployment

### Test 1: Database Setup

```bash
# Test database creation
mysql -u root -p <<EOF
CREATE DATABASE rentapp_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'rentapp_test'@'localhost' IDENTIFIED BY 'test_password';
GRANT ALL PRIVILEGES ON rentapp_test.* TO 'rentapp_test'@'localhost';
FLUSH PRIVILEGES;
EXIT;
EOF

# Test connection
mysql -u rentapp_test -ptest_password rentapp_test -e "SELECT 1;"
```

### Test 2: Backend Setup

```bash
# Test Composer install
cd backend
composer install --no-dev --optimize-autoloader

# Test Laravel commands
php artisan key:generate
php artisan config:cache
php artisan route:cache
php artisan migrate --force

# Test API endpoint
php artisan serve --host=127.0.0.1 --port=8000
# In another terminal:
curl http://127.0.0.1:8000/api/v1/health
```

### Test 3: Frontend Setup

```bash
# Test npm install
cd frontend
npm ci

# Test build
npm run build

# Test production server
npm start
# In browser: http://localhost:3000
```

### Test 4: Nginx Configuration

```bash
# Test Nginx config syntax
sudo nginx -t

# Test with sample config
sudo nano /etc/nginx/sites-available/rentapplicaiton-test
# Paste config from deployment guide
sudo ln -s /etc/nginx/sites-available/rentapplicaiton-test /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Test 5: Deployment Script

```bash
# Test script syntax
bash -n config/deploy/deploy.sh

# Test script with dry-run (if implemented)
# Or review script manually
cat config/deploy/deploy.sh
```

---

## Pre-Deployment Validation

### Use Pre-Deployment Check Script

```bash
# Run pre-deployment checks
cd /path/to/RentApplicaiton
chmod +x scripts/pre-deployment-checks.sh
./scripts/pre-deployment-checks.sh
```

**This script checks:**
- ✅ Required software installed
- ✅ PHP version compatibility
- ✅ Node.js version compatibility
- ✅ Database connectivity
- ✅ File permissions
- ✅ Disk space
- ✅ Service status

### Manual Validation Checklist

**Before deploying, verify:**

- [ ] **Server Requirements Met**
  ```bash
  php -v          # Should be 8.2+ or 8.3+
  node -v         # Should be 18.x or 20.x
  composer -v     # Should be latest
  mysql --version # Should be 8.0+
  nginx -v       # Should be latest
  ```

- [ ] **Environment Files Ready**
  ```bash
  # Backend
  ls -la backend/.env
  # Frontend
  ls -la frontend/.env.local
  ```

- [ ] **Database Ready**
  ```bash
  mysql -u rentapp_user -p rentapp_production -e "SHOW TABLES;"
  ```

- [ ] **GitHub Secrets Configured**
  - SSH_PRIVATE_KEY
  - SSH_USER
  - SSH_HOST
  - APP_DIRECTORY (optional)

- [ ] **SSH Access Working**
  ```bash
  ssh -i ~/.ssh/github_actions_deploy your-username@your-server-ip
  ```

---

## Testing Checklist

### Pre-Deployment Testing

- [ ] **Docker test passed** (if using Docker)
- [ ] **VM test passed** (if using VM)
- [ ] **Staging test passed** (if using staging)
- [ ] **Component tests passed**
- [ ] **Pre-deployment checks passed**
- [ ] **Deployment script reviewed**
- [ ] **Nginx config tested**
- [ ] **Database migrations tested**
- [ ] **Frontend build tested**

### Deployment Testing

- [ ] **GitHub Actions workflow tested**
- [ ] **Deployment script executed successfully**
- [ ] **Services started correctly**
- [ ] **API health check passed**
- [ ] **Frontend loads correctly**
- [ ] **Database migrations applied**
- [ ] **File permissions correct**
- [ ] **Logs show no errors**

### Post-Deployment Testing

- [ ] **Website accessible**
- [ ] **API endpoints working**
- [ ] **Login functionality works**
- [ ] **File uploads work**
- [ ] **Queue workers running**
- [ ] **Scheduled tasks configured**
- [ ] **SSL certificate installed** (if using domain)
- [ ] **Monitoring set up**

---

## Quick Test Commands

### Test Backend Locally

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
# Test: curl http://localhost:8000/api/v1/health
```

### Test Frontend Locally

```bash
cd frontend
npm install
npm run build
npm start
# Test: Open http://localhost:3000
```

### Test Deployment Script Syntax

```bash
bash -n config/deploy/deploy.sh
```

### Test Nginx Config

```bash
sudo nginx -t
```

### Test Database Connection

```bash
mysql -u rentapp_user -p rentapp_production -e "SELECT 1;"
```

---

## Recommended Testing Flow

**For first-time deployment:**

1. ✅ **Start with Docker** (15 min) - Quick validation
2. ✅ **Then VM testing** (1-2 hours) - Full simulation
3. ✅ **Then staging server** (30 min) - Real environment
4. ✅ **Finally production** - Deploy with confidence

**For subsequent deployments:**

1. ✅ **Component testing** (10 min) - Test changed components
2. ✅ **Staging deployment** (15 min) - Validate changes
3. ✅ **Production deployment** - Deploy

---

## Troubleshooting Test Failures

### Docker Issues

```bash
# Check Docker is running
docker ps

# Check logs
docker-compose logs

# Rebuild containers
docker-compose build --no-cache
docker-compose up -d
```

### VM Issues

```bash
# Check VM network
ping VM_IP_ADDRESS

# Check SSH
ssh -v your-username@VM_IP_ADDRESS

# Check services in VM
sudo systemctl status nginx
sudo systemctl status php8.3-fpm
```

### Staging Issues

```bash
# Check deployment logs
tail -f /var/www/rentapplicaiton-staging/logs/deployment.log

# Check service status
sudo systemctl status nginx
pm2 status

# Check application logs
tail -f /var/www/rentapplicaiton-staging/backend/storage/logs/laravel.log
```

---

## Safety Tips

1. **Always test in non-production first**
2. **Keep backups before testing**
3. **Use separate databases for testing**
4. **Test rollback procedures**
5. **Document any issues found**
6. **Test during low-traffic periods**

---

## Next Steps

After successful testing:

1. ✅ Review `DEPLOYMENT_GUIDE.md` one more time
2. ✅ Set up production server
3. ✅ Configure GitHub Secrets
4. ✅ Deploy to production
5. ✅ Monitor closely for first 24 hours

---

**Remember:** Testing saves time and prevents issues in production. Take the time to test thoroughly! 🧪✅

