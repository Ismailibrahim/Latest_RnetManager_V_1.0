# 🚀 Deployment Quick Checklist

Use this checklist while following the detailed guide: `DEPLOYMENT_STEP_BY_STEP.md`

---

## PART 1: VPS Server Setup

- [ ] Connected to VPS via SSH
- [ ] Updated server (`sudo apt update && sudo apt upgrade -y`)
- [ ] Installed Git
- [ ] Installed PHP 8.2 and extensions
- [ ] Installed Composer
- [ ] Installed Node.js 18+
- [ ] Installed Nginx
- [ ] Installed MySQL
- [ ] Created `/var/www/webapp` directory
- [ ] Set correct permissions (`sudo chown -R $USER:$USER /var/www/webapp`)
- [ ] Cloned repository to `/var/www/webapp`
- [ ] Created backend `.env` file
- [ ] Generated Laravel app key (`php artisan key:generate`)
- [ ] Created MySQL database
- [ ] Created MySQL user and granted permissions
- [ ] Created frontend `.env.local` file
- [ ] Installed backend dependencies (`composer install`)
- [ ] Ran database migrations (`php artisan migrate --force`)
- [ ] Installed frontend dependencies (`npm install`)
- [ ] Built frontend (`npm run build`)
- [ ] Copied `deploy.sh` script and made it executable

---

## PART 2: SSH Key Setup

- [ ] Generated SSH key on local computer
- [ ] Displayed public key
- [ ] Added public key to VPS `~/.ssh/authorized_keys`
- [ ] Set correct permissions (`chmod 600 ~/.ssh/authorized_keys`)
- [ ] Tested SSH connection without password

---

## PART 3: GitHub Secrets

- [ ] Opened GitHub repository → Settings → Secrets → Actions
- [ ] Added `SSH_PRIVATE_KEY` (entire private key content)
- [ ] Added `SSH_USER` (VPS username)
- [ ] Added `SSH_HOST` (VPS IP or domain)
- [ ] Verified all 3 secrets are listed

---

## PART 4: Nginx Configuration

- [ ] Created `/etc/nginx/sites-available/webapp` file
- [ ] Updated server_name with your domain/IP
- [ ] Enabled site (`sudo ln -s`)
- [ ] Tested Nginx config (`sudo nginx -t`)
- [ ] Reloaded Nginx (`sudo systemctl reload nginx`)
- [ ] Started backend server (PHP artisan serve or Supervisor)

---

## PART 5: Test Deployment

- [ ] Made test commit and pushed to `main` branch
- [ ] Checked GitHub Actions tab
- [ ] Watched deployment workflow complete successfully
- [ ] Verified files updated on VPS
- [ ] Tested website in browser
- [ ] Verified API endpoint works

---

## Troubleshooting Commands

If something goes wrong, use these:

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check file permissions
ls -la /var/www/webapp

# Fix permissions
sudo chown -R $USER:$USER /var/www/webapp

# Test database connection
mysql -u rentapp_user -p rentapp_production

# Check backend logs
tail -f /var/www/webapp/backend/storage/logs/laravel.log

# Restart services
sudo systemctl restart nginx
sudo systemctl restart php8.2-fpm
```

---

## Quick Reference: File Locations

- **App directory:** `/var/www/webapp`
- **Backend .env:** `/var/www/webapp/backend/.env`
- **Frontend .env:** `/var/www/webapp/frontend/.env.local`
- **Deploy script:** `/var/www/webapp/deploy.sh`
- **Nginx config:** `/etc/nginx/sites-available/webapp`
- **SSH authorized_keys:** `~/.ssh/authorized_keys`

---

## Quick Reference: Important Commands

```bash
# Navigate to app
cd /var/www/webapp

# Pull latest code
git pull origin main

# Backend commands
cd backend
composer install --no-dev
php artisan migrate --force
php artisan optimize

# Frontend commands
cd ../frontend
npm install
npm run build

# Run deployment script
./deploy.sh
```

---

**Follow the detailed guide:** `DEPLOYMENT_STEP_BY_STEP.md` for complete instructions.

