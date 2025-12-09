# Manual Server Update Commands

## Quick Update (Frontend Changes Only)

Since you've updated frontend components (sidebar.jsx and topbar.jsx), run these commands on your server:

```bash
# 1. Navigate to your application directory
cd /var/www/rentapplicaiton
# OR if your app is in a different location:
# cd /var/www/webapp

# 2. Pull the latest changes from GitHub
git fetch --all
git pull origin main

# 3. Navigate to frontend directory
cd frontend

# 4. Install any new dependencies (if needed)
npm install

# 5. Build the frontend for production
npm run build

# 6. Restart PM2 process (if using PM2)
pm2 restart rentapp-frontend
# OR if using ecosystem.config.js:
# cd ..
# pm2 restart ecosystem.config.js --update-env
# pm2 save

# 7. Verify the update
pm2 logs rentapp-frontend --lines 50
```

## Alternative: Use Deployment Script

If you have the deployment script set up, you can simply run:

```bash
cd /var/www/rentapplicaiton
./deploy.sh
```

This will handle everything automatically including:
- Pulling latest code
- Building frontend
- Restarting services
- Running health checks

## Verify the Update

After updating, verify the changes are live:

```bash
# Check PM2 status
pm2 status

# View recent logs
pm2 logs rentapp-frontend --lines 20

# Check if frontend is running
curl -I http://localhost:3000
# OR check your domain
curl -I https://yourdomain.com
```

## Troubleshooting

If you encounter issues:

```bash
# Check if git pull worked
git log --oneline -5

# Check if build succeeded
cd frontend
ls -la .next  # Should show build files

# Restart PM2 if needed
pm2 restart all
pm2 save

# Check for errors
pm2 logs rentapp-frontend --err
```

---

**Note:** Replace `/var/www/rentapplicaiton` with your actual application directory path if different.

