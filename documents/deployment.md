# Deployment Guide

This guide covers setting up automated deployment for RentApplication using GitHub Actions.

## Prerequisites

- VPS server (DigitalOcean, AWS, etc.) with:
  - Ubuntu 20.04+ or similar Linux distribution
  - Nginx web server
  - PHP 8.2+ with FPM
  - Node.js 18+ and npm
  - Composer (PHP package manager)
  - Git
  - MySQL/MariaDB database

## Step 1: Server Setup

### 1.1 Create Application Directory

```bash
sudo mkdir -p /var/www/webapp
sudo chown -R $USER:$USER /var/www/webapp
cd /var/www/webapp
```

### 1.2 Clone Repository

```bash
git clone https://github.com/your-username/RentApplicaiton.git .
```

### 1.3 Install Deployment Script

Copy the deployment script to your server:

```bash
# Copy deploy.sh from config/deploy/deploy.sh to /var/www/webapp/deploy.sh
chmod +x /var/www/webapp/deploy.sh
```

### 1.4 Configure Environment Files

**Backend (.env):**
```bash
cd /var/www/webapp/backend
cp .env.example .env
nano .env  # Edit with your production values
php artisan key:generate
```

**Frontend (.env.local):**
```bash
cd /var/www/webapp/frontend
cp .env.example .env.local
nano .env.local  # Edit with your production values
```

### 1.5 Initial Setup

```bash
cd /var/www/webapp/backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan optimize

cd ../frontend
npm ci
npm run build
```

## Step 2: SSH Key Setup

### 2.1 Generate SSH Key (on your local machine or CI server)

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy
```

### 2.2 Add Public Key to VPS

```bash
# Copy the public key content
cat ~/.ssh/github_actions_deploy.pub

# On your VPS, add it to authorized_keys
ssh user@your-vps-ip
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "YOUR_PUBLIC_KEY_CONTENT" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 2.3 Test SSH Connection

```bash
ssh -i ~/.ssh/github_actions_deploy user@your-vps-ip
```

## Step 3: GitHub Secrets Configuration

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `SSH_PRIVATE_KEY` | Private SSH key content (entire key including `-----BEGIN` and `-----END`) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SSH_USER` | SSH username for VPS | `ubuntu` or `root` |
| `SSH_HOST` | VPS IP address or domain | `123.45.67.89` or `app.example.com` |
| `APP_DIRECTORY` | (Optional) Custom app directory path | `/var/www/webapp` |

### How to get SSH_PRIVATE_KEY:

```bash
# On your local machine
cat ~/.ssh/github_actions_deploy
# Copy the entire output including BEGIN and END lines
```

## Step 4: Nginx Configuration

Create an Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/webapp
```

**Example configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    root /var/www/webapp/frontend/.next;
    
    # Frontend (Next.js)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Static files
    location /_next/static {
        alias /var/www/webapp/frontend/.next/static;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/webapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 5: PHP-FPM Configuration

Ensure PHP-FPM is running:

```bash
sudo systemctl status php8.2-fpm  # or php8.3-fpm
sudo systemctl enable php8.2-fpm
```

## Step 6: Database Setup

Create production database:

```bash
mysql -u root -p
```

```sql
CREATE DATABASE rentapp_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'rentapp_user'@'localhost' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON rentapp_production.* TO 'rentapp_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Update your `.env` file with production database credentials.

## Step 7: Test Deployment

### 7.1 Manual Test

Push to main branch and watch GitHub Actions:

```bash
git add .
git commit -m "Test deployment"
git push origin main
```

Go to: `https://github.com/your-username/RentApplicaiton/actions`

### 7.2 Verify Deployment

After deployment completes:

1. Check if services are running:
   ```bash
   sudo systemctl status nginx
   sudo systemctl status php8.2-fpm
   ```

2. Test API endpoint:
   ```bash
   curl http://your-domain.com/api/v1/
   ```

3. Visit your frontend:
   ```
   http://your-domain.com
   ```

## Troubleshooting

### Deployment Fails

1. **Check SSH connection:**
   ```bash
   ssh -i ~/.ssh/github_actions_deploy user@your-vps-ip
   ```

2. **Check permissions:**
   ```bash
   ls -la /var/www/webapp
   sudo chown -R $USER:$USER /var/www/webapp
   ```

3. **Check logs:**
   ```bash
   # GitHub Actions logs
   # Check the Actions tab in GitHub
   
   # Server logs
   tail -f /var/log/nginx/error.log
   tail -f /var/log/php8.2-fpm.log
   ```

### Services Not Restarting

If services fail to restart, check:

```bash
sudo systemctl status nginx
sudo systemctl status php8.2-fpm
sudo journalctl -u nginx -n 50
sudo journalctl -u php8.2-fpm -n 50
```

### Database Migration Fails

```bash
cd /var/www/webapp/backend
php artisan migrate:status
php artisan migrate --force
```

## Rollback Procedure

If deployment fails, rollback to previous version:

```bash
cd /var/www/webapp
git log --oneline -10  # Find previous commit
git reset --hard <previous-commit-hash>
cd backend && php artisan optimize
cd ../frontend && npm run build
```

## Security Best Practices

1. **Never commit `.env` files**
2. **Use strong database passwords**
3. **Enable firewall (UFW):**
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

4. **Set up SSL/HTTPS** (Let's Encrypt):
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

5. **Regular backups:**
   ```bash
   # Database backup
   mysqldump -u rentapp_user -p rentapp_production > backup_$(date +%Y%m%d).sql
   ```

## Monitoring

Set up monitoring for:
- Server uptime
- Application errors
- Database performance
- Disk space

Consider using tools like:
- UptimeRobot (uptime monitoring)
- Sentry (error tracking)
- New Relic (performance monitoring)

---

**Need help?** Check the GitHub Actions logs or server logs for detailed error messages.

