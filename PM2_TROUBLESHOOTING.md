# PM2 Frontend Process Troubleshooting

## Issue

PM2 shows `rentapp-frontend` in "errored" state:
```
│ 0  │ rentapp-frontend   │ fork     │ 9    │ errored   │ 0%       │ 0b       │
```

## Quick Fix Steps

### Step 1: Check PM2 Logs

```bash
# View error logs
pm2 logs rentapp-frontend --err

# View all logs
pm2 logs rentapp-frontend

# View last 50 lines
pm2 logs rentapp-frontend --lines 50
```

### Step 2: Check Common Issues

**1. Frontend not built:**
```bash
cd /var/www/rentapplicaiton/frontend
ls -la .next
```

If `.next` directory doesn't exist or is empty, build it:
```bash
cd /var/www/rentapplicaiton/frontend
npm run build
```

**2. Missing node_modules:**
```bash
cd /var/www/rentapplicaiton/frontend
ls -la node_modules
```

If missing:
```bash
npm ci
```

**3. Check if port 3000 is already in use:**
```bash
sudo netstat -tulpn | grep :3000
# Or
sudo lsof -i :3000
```

If port is in use, kill the process:
```bash
sudo kill -9 <PID>
```

**4. Check file permissions:**
```bash
cd /var/www/rentapplicaiton
ls -la frontend/.next
ls -la logs/
```

Create logs directory if missing:
```bash
mkdir -p /var/www/rentapplicaiton/logs
chmod 755 /var/www/rentapplicaiton/logs
```

**5. Check .env.local file:**
```bash
cd /var/www/rentapplicaiton/frontend
ls -la .env.local
cat .env.local
```

Make sure it exists and has correct values.

### Step 3: Test Frontend Manually

```bash
cd /var/www/rentapplicaiton/frontend
npm start
```

If this works, the issue is with PM2 configuration. If it fails, check the error message.

### Step 4: Fix PM2 Configuration

**Check ecosystem.config.js paths:**

```bash
cd /var/www/rentapplicaiton
cat ecosystem.config.js
```

Make sure paths are correct. The config should use `/var/www/rentapplicaiton` (not `/var/www/webapp`).

**Update ecosystem.config.js if needed:**

```bash
cd /var/www/rentapplicaiton
nano ecosystem.config.js
```

Verify these paths:
- `cwd: path.join(APP_DIR, 'frontend')` should resolve to `/var/www/rentapplicaiton/frontend`
- Log files should be in `/var/www/rentapplicaiton/logs/`

### Step 5: Restart PM2 Process

```bash
# Stop the errored process
pm2 stop rentapp-frontend
pm2 delete rentapp-frontend

# Make sure logs directory exists
mkdir -p /var/www/rentapplicaiton/logs

# Rebuild frontend (if needed)
cd /var/www/rentapplicaiton/frontend
npm run build

# Start PM2 again
cd /var/www/rentapplicaiton
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs rentapp-frontend
```

## Common Error Messages and Fixes

### Error: "Cannot find module 'next'"

**Fix:**
```bash
cd /var/www/rentapplicaiton/frontend
npm install
npm run build
```

### Error: "Port 3000 already in use"

**Fix:**
```bash
# Find and kill process using port 3000
sudo lsof -ti:3000 | xargs sudo kill -9

# Or change port in ecosystem.config.js
# Add PORT: 3001 to env section
```

### Error: "ENOENT: no such file or directory"

**Fix:**
```bash
# Check if frontend directory exists
ls -la /var/www/rentapplicaiton/frontend

# Check if .next directory exists
ls -la /var/www/rentapplicaiton/frontend/.next

# Rebuild if missing
cd /var/www/rentapplicaiton/frontend
npm run build
```

### Error: "Cannot find .env.local"

**Fix:**
```bash
cd /var/www/rentapplicaiton/frontend
cp .env.example .env.local
# Or
cp ../env/frontend.env.example .env.local

# Edit if needed
nano .env.local
```

### Error: "Permission denied"

**Fix:**
```bash
# Fix permissions
sudo chown -R $USER:$USER /var/www/rentapplicaiton
sudo chmod -R 755 /var/www/rentapplicaiton/frontend
```

## Complete Reset Procedure

If nothing works, try a complete reset:

```bash
# Stop and delete PM2 process
pm2 stop rentapp-frontend
pm2 delete rentapp-frontend

# Clean frontend
cd /var/www/rentapplicaiton/frontend
rm -rf .next
rm -rf node_modules

# Reinstall
npm ci

# Rebuild
npm run build

# Create logs directory
mkdir -p /var/www/rentapplicaiton/logs

# Start PM2
cd /var/www/rentapplicaiton
pm2 start ecosystem.config.js
pm2 save

# Check status
pm2 status
pm2 logs rentapp-frontend
```

## Verify It's Working

```bash
# Check PM2 status
pm2 status

# Should show:
# │ 0  │ rentapp-frontend   │ fork     │ 0    │ online    │ ... │

# Test frontend
curl http://localhost:3000

# Check logs
pm2 logs rentapp-frontend --lines 20
```

## Next Steps

Once PM2 is running:
1. Test frontend: `curl http://localhost:3000`
2. Test from browser: `http://YOUR_SERVER_IP`
3. Check Nginx is proxying correctly
4. Continue with deployment guide

