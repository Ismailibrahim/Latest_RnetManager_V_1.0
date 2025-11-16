# 🚀 Complete Step-by-Step Deployment Guide

This guide will walk you through setting up automated deployment from scratch.

---

## 📋 Prerequisites Checklist

Before starting, make sure you have:
- [ ] A VPS server (DigitalOcean, AWS, Linode, etc.)
- [ ] SSH access to your VPS
- [ ] A GitHub account
- [ ] Your code pushed to a GitHub repository

---

## PART 1: VPS Server Setup

### Step 1.1: Connect to Your VPS

Open your terminal (PowerShell on Windows, Terminal on Mac/Linux) and connect:

```bash
ssh your-username@your-server-ip
# Example: ssh root@123.45.67.89
```

**If you don't know your server IP:**
- Check your VPS provider dashboard (DigitalOcean, AWS, etc.)
- Look for "Public IP" or "IPv4 Address"

**If you don't know your username:**
- Usually `root` for new servers
- Or `ubuntu` for Ubuntu servers
- Check your VPS provider documentation

---

### Step 1.2: Update Your Server

Once connected, update the system:

```bash
sudo apt update
sudo apt upgrade -y
```

---

### Step 1.3: Install Required Software

Install all necessary tools:

```bash
# Install Git
sudo apt install git -y

# Install PHP 8.2 and required extensions
sudo apt install php8.2 php8.2-fpm php8.2-mysql php8.2-xml php8.2-mbstring php8.2-curl php8.2-zip -y

# Install Composer (PHP package manager)
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install nginx -y

# Install MySQL
sudo apt install mysql-server -y
```

**Verify installations:**

```bash
php -v          # Should show PHP 8.2.x
composer -v     # Should show Composer version
node -v         # Should show v18.x.x or higher
npm -v          # Should show npm version
nginx -v        # Should show nginx version
mysql --version # Should show MySQL version
```

---

### Step 1.4: Create Application Directory

```bash
# Create the directory
sudo mkdir -p /var/www/webapp

# Change ownership to your user (replace 'your-username' with your actual username)
sudo chown -R $USER:$USER /var/www/webapp

# Navigate to the directory
cd /var/www/webapp
```

**To find your username, run:**
```bash
whoami
```

---

### Step 1.5: Clone Your Repository

```bash
cd /var/www/webapp

# Clone your repository (replace with your actual GitHub URL)
git clone https://github.com/YOUR-USERNAME/RentApplicaiton.git .

# If you get "directory not empty" error, use:
# git clone https://github.com/YOUR-USERNAME/RentApplicaiton.git temp
# mv temp/* . && mv temp/.git . && rmdir temp
```

**To get your GitHub URL:**
1. Go to your GitHub repository
2. Click the green "Code" button
3. Copy the HTTPS URL
4. Replace `YOUR-USERNAME` with your actual GitHub username

---

### Step 1.6: Set Up Backend Environment

```bash
cd /var/www/webapp/backend

# Copy the example environment file
cp .env.example .env

# Edit the .env file
nano .env
```

**In the nano editor, update these values:**

```env
APP_NAME=RentApplication
APP_ENV=production
APP_DEBUG=false
APP_URL=http://your-domain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=rentapp_production
DB_USERNAME=rentapp_user
DB_PASSWORD=your_strong_password_here

FRONTEND_URL=http://your-domain.com
```

**To save in nano:**
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

**Generate application key:**

```bash
php artisan key:generate
```

---

### Step 1.7: Set Up Database

```bash
# Log into MySQL
sudo mysql -u root -p
```

**In MySQL, run these commands (replace password with a strong password):**

```sql
CREATE DATABASE rentapp_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'rentapp_user'@'localhost' IDENTIFIED BY 'your_strong_password_here';
GRANT ALL PRIVILEGES ON rentapp_production.* TO 'rentapp_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Update your `.env` file with the same database credentials:**

```bash
nano /var/www/webapp/backend/.env
```

---

### Step 1.8: Set Up Frontend Environment

```bash
cd /var/www/webapp/frontend

# Copy the example environment file
cp .env.example .env.local

# Edit the .env.local file
nano .env.local
```

**Update these values:**

```env
NEXT_PUBLIC_API_URL=http://your-domain.com/api/v1
NEXT_PUBLIC_APP_NAME=RentApplication
NEXT_PUBLIC_APP_ENV=production
```

**Save and exit:** `Ctrl + X`, then `Y`, then `Enter`

---

### Step 1.9: Install Dependencies and Run Migrations

**Backend:**

```bash
cd /var/www/webapp/backend

# Install PHP dependencies
composer install --no-dev --optimize-autoloader

# Run database migrations
php artisan migrate --force

# Cache configuration
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize
```

**Frontend:**

```bash
cd /var/www/webapp/frontend

# Install Node dependencies
npm install

# Build for production
npm run build
```

---

### Step 1.10: Copy Deployment Script

```bash
# Copy the deployment script
cp /var/www/webapp/config/deploy/deploy.sh /var/www/webapp/deploy.sh

# Make it executable
chmod +x /var/www/webapp/deploy.sh
```

---

## PART 2: SSH Key Setup for GitHub Actions

### Step 2.1: Generate SSH Key (On Your Local Computer)

**On Windows (PowerShell):**
```powershell
# Generate SSH key
ssh-keygen -t ed25519 -C "github-actions-deploy" -f $env:USERPROFILE\.ssh\github_actions_deploy

# When prompted for passphrase, press Enter (leave empty)
```

**On Mac/Linux:**
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# When prompted for passphrase, press Enter (leave empty)
```

---

### Step 2.2: Copy Public Key to VPS

**Display the public key:**

**Windows (PowerShell):**
```powershell
Get-Content $env:USERPROFILE\.ssh\github_actions_deploy.pub
```

**Mac/Linux:**
```bash
cat ~/.ssh/github_actions_deploy.pub
```

**Copy the entire output** (it starts with `ssh-ed25519` and ends with `github-actions-deploy`)

---

### Step 2.3: Add Public Key to VPS

**Connect to your VPS:**
```bash
ssh your-username@your-server-ip
```

**On your VPS, run:**

```bash
# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add the public key
nano ~/.ssh/authorized_keys
```

**In nano:**
1. Paste your public key at the end of the file
2. Press `Ctrl + X`
3. Press `Y` to save
4. Press `Enter`

**Set correct permissions:**
```bash
chmod 600 ~/.ssh/authorized_keys
```

---

### Step 2.4: Test SSH Connection

**On your local computer, test the connection:**

```bash
# Windows
ssh -i $env:USERPROFILE\.ssh\github_actions_deploy your-username@your-server-ip

# Mac/Linux
ssh -i ~/.ssh/github_actions_deploy your-username@your-server-ip
```

**If it connects without asking for a password, you're good!**

---

## PART 3: GitHub Secrets Configuration

### Step 3.1: Get Your Private SSH Key

**On your local computer:**

**Windows (PowerShell):**
```powershell
Get-Content $env:USERPROFILE\.ssh\github_actions_deploy
```

**Mac/Linux:**
```bash
cat ~/.ssh/github_actions_deploy
```

**Copy the ENTIRE output** including:
- `-----BEGIN OPENSSH PRIVATE KEY-----`
- All the key content in the middle
- `-----END OPENSSH PRIVATE KEY-----`

---

### Step 3.2: Add Secrets to GitHub

1. **Go to your GitHub repository**
   - Navigate to: `https://github.com/YOUR-USERNAME/RentApplicaiton`

2. **Click on "Settings"** (top menu)

3. **Click on "Secrets and variables"** → **"Actions"** (left sidebar)

4. **Click "New repository secret"**

5. **Add these 3 secrets one by one:**

   **Secret 1: SSH_PRIVATE_KEY**
   - Name: `SSH_PRIVATE_KEY`
   - Value: Paste the entire private key you copied in Step 3.1
   - Click "Add secret"

   **Secret 2: SSH_USER**
   - Name: `SSH_USER`
   - Value: Your VPS username (usually `root` or `ubuntu`)
   - Click "Add secret"

   **Secret 3: SSH_HOST**
   - Name: `SSH_HOST`
   - Value: Your VPS IP address (e.g., `123.45.67.89`) or domain name
   - Click "Add secret"

6. **Verify all 3 secrets are listed**

---

## PART 4: Nginx Configuration

### Step 4.1: Create Nginx Configuration File

**On your VPS:**

```bash
sudo nano /etc/nginx/sites-available/webapp
```

**Paste this configuration** (replace `your-domain.com` with your actual domain or IP):

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Frontend - Next.js
    location / {
        root /var/www/webapp/frontend/.next;
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

**Save:** `Ctrl + X`, then `Y`, then `Enter`

---

### Step 4.2: Enable the Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/webapp /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

---

### Step 4.3: Start Laravel Backend Server

**For now, we'll use PHP's built-in server. Later you can set up a process manager:**

```bash
cd /var/www/webapp/backend

# Start server in background
nohup php artisan serve --host=127.0.0.1 --port=8000 > /dev/null 2>&1 &
```

**Or use Supervisor (recommended for production):**

```bash
# Install Supervisor
sudo apt install supervisor -y

# Create supervisor config
sudo nano /etc/supervisor/conf.d/rentapp-backend.conf
```

**Paste this:**

```ini
[program:rentapp-backend]
command=php /var/www/webapp/backend/artisan serve --host=127.0.0.1 --port=8000
directory=/var/www/webapp/backend
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/www/webapp/backend/storage/logs/backend.log
```

**Save and reload:**

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start rentapp-backend
```

---

## PART 5: Test Deployment

### Step 5.1: Make a Test Commit

**On your local computer:**

```bash
# Navigate to your project
cd path/to/RentApplicaiton

# Make a small change (or just add a comment)
echo "# Test deployment" >> README.md

# Commit and push
git add README.md
git commit -m "Test deployment"
git push origin main
```

---

### Step 5.2: Watch GitHub Actions

1. **Go to your GitHub repository**
2. **Click on "Actions" tab** (top menu)
3. **You should see a workflow running** called "🚀 Deploy to VPS via SSH"
4. **Click on it to see the progress**
5. **Wait for it to complete** (should take 2-5 minutes)

---

### Step 5.3: Verify Deployment

**Check if deployment worked:**

```bash
# SSH into your VPS
ssh your-username@your-server-ip

# Check if files were updated
cd /var/www/webapp
git log -1  # Should show your latest commit

# Check backend
cd backend
php artisan --version  # Should work

# Check frontend
cd ../frontend
ls -la .next  # Should have build files
```

**Test your website:**

1. Open browser
2. Go to: `http://your-server-ip` or `http://your-domain.com`
3. You should see your application

---

## PART 6: Troubleshooting

### Problem: GitHub Actions fails with "Permission denied"

**Solution:**
- Check if SSH key was copied correctly
- Verify `~/.ssh/authorized_keys` has correct permissions (600)
- Test SSH connection manually

### Problem: Deployment fails at "composer install"

**Solution:**
```bash
# On VPS, check permissions
sudo chown -R $USER:$USER /var/www/webapp
cd /var/www/webapp/backend
composer install --no-dev
```

### Problem: Frontend build fails

**Solution:**
```bash
# On VPS
cd /var/www/webapp/frontend
rm -rf node_modules .next
npm install
npm run build
```

### Problem: Can't access website

**Solution:**
```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check if backend is running
curl http://127.0.0.1:8000/api/v1/
```

### Problem: Database connection fails

**Solution:**
```bash
# Test database connection
mysql -u rentapp_user -p rentapp_production

# Check .env file
cat /var/www/webapp/backend/.env | grep DB_
```

---

## ✅ Success Checklist

After completing all steps, you should have:

- [ ] VPS server set up with all required software
- [ ] Application cloned and configured
- [ ] Database created and migrations run
- [ ] SSH keys set up for GitHub Actions
- [ ] GitHub Secrets configured
- [ ] Nginx configured and running
- [ ] Backend server running
- [ ] Frontend built
- [ ] GitHub Actions deployment working
- [ ] Website accessible in browser

---

## 🎉 Next Steps

Once deployment is working:

1. **Set up SSL/HTTPS** (Let's Encrypt)
2. **Configure domain name** (if you have one)
3. **Set up monitoring** (optional)
4. **Configure backups** (important!)

---

## 📞 Need Help?

If you get stuck:
1. Check GitHub Actions logs for error messages
2. Check server logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify all steps were completed correctly
4. Check file permissions: `ls -la /var/www/webapp`

---

**That's it! Your automated deployment is now set up!** 🚀

