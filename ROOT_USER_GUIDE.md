# Working as Root - Best Practices Guide

## ⚠️ Yes, This Is Exactly What Causes The Issue!

When you're connected as `root` and create/modify files, they become owned by `root`. PHP-FPM runs as `www-data`, so it can't write to those files.

## 🔍 Common Scenarios That Cause This

### 1. **Creating/Editing Files as Root**
```bash
# ❌ BAD - Creates file as root
sudo nano /var/www/rentapplicaiton/backend/storage/logs/probe.log
sudo touch /var/www/rentapplicaiton/backend/storage/logs/new.log

# ✅ GOOD - Use www-data
sudo -u www-data touch /var/www/rentapplicaiton/backend/storage/logs/new.log
```

### 2. **Running Laravel Commands as Root**
```bash
# ❌ BAD - Creates files with root ownership
sudo php artisan cache:clear
sudo php artisan config:clear
sudo php artisan migrate

# ✅ GOOD - Run as www-data
sudo -u www-data php artisan cache:clear
sudo -u www-data php artisan config:clear
sudo -u www-data php artisan migrate
```

### 3. **Copying Files as Root**
```bash
# ❌ BAD - Copied file owned by root
sudo cp file.log /var/www/rentapplicaiton/backend/storage/logs/

# ✅ GOOD - Copy then fix ownership
sudo cp file.log /var/www/rentapplicaiton/backend/storage/logs/
sudo chown www-data:www-data /var/www/rentapplicaiton/backend/storage/logs/file.log
```

### 4. **Extracting Archives as Root**
```bash
# ❌ BAD - Extracted files owned by root
sudo tar -xzf backup.tar.gz -C /var/www/rentapplicaiton/backend/

# ✅ GOOD - Extract then fix ownership
sudo tar -xzf backup.tar.gz -C /var/www/rentapplicaiton/backend/
sudo chown -R www-data:www-data /var/www/rentapplicaiton/backend/storage/
```

## 🛡️ Safe Practices When Working as Root

### Option 1: Switch User Before Working
```bash
# Switch to www-data user
sudo su - www-data

# Now all commands run as www-data
cd /var/www/rentapplicaiton/backend
php artisan some:command
touch storage/logs/test.log

# Exit when done
exit
```

### Option 2: Use sudo -u www-data
```bash
# Run individual commands as www-data
sudo -u www-data php artisan cache:clear
sudo -u www-data touch storage/logs/test.log
sudo -u www-data nano storage/logs/test.log
```

### Option 3: Fix Ownership After Working as Root
```bash
# After doing work as root, always run:
sudo /var/www/rentapplicaiton/backend/fix-permissions.sh

# Or manually:
sudo chown -R www-data:www-data /var/www/rentapplicaiton/backend/storage/
sudo chmod -R 775 /var/www/rentapplicaiton/backend/storage/
```

## 🔍 How to Check If You've Created Root-Owned Files

### Check Storage Directory
```bash
# Find files owned by root in storage
find /var/www/rentapplicaiton/backend/storage -user root -ls

# Find files NOT owned by www-data
find /var/www/rentapplicaiton/backend/storage ! -user www-data -ls
```

### Check Specific Logs Directory
```bash
# List ownership of log files
ls -la /var/www/rentapplicaiton/backend/storage/logs/

# Look for files owned by root (should be none)
ls -la /var/www/rentapplicaiton/backend/storage/logs/ | grep root
```

### Quick Ownership Check Script
```bash
#!/bin/bash
# check-ownership.sh
STORAGE="/var/www/rentapplicaiton/backend/storage"
WRONG_OWNER=$(find $STORAGE -type f ! -user www-data 2>/dev/null | wc -l)

if [ $WRONG_OWNER -gt 0 ]; then
    echo "⚠️  WARNING: Found $WRONG_OWNER files not owned by www-data"
    find $STORAGE -type f ! -user www-data 2>/dev/null
    echo ""
    echo "Fix with: sudo /var/www/rentapplicaiton/backend/fix-permissions.sh"
else
    echo "✅ All storage files have correct ownership"
fi
```

## 📋 Checklist: Before & After Working as Root

### Before Starting Work
- [ ] Identify which files/directories you'll be modifying
- [ ] Note the current ownership: `ls -la /path/to/file`

### While Working as Root
- [ ] Use `sudo -u www-data` for Laravel commands
- [ ] Or switch to www-data user: `sudo su - www-data`
- [ ] If you must create files as root, note them down

### After Working as Root
- [ ] **ALWAYS** run: `sudo /var/www/rentapplicaiton/backend/fix-permissions.sh`
- [ ] Verify: `ls -la /var/www/rentapplicaiton/backend/storage/logs/ | grep root`
- [ ] Test: `sudo -u www-data touch /var/www/rentapplicaiton/backend/storage/logs/test.log && rm /var/www/rentapplicaiton/backend/storage/logs/test.log`

## 🚨 Common Mistakes to Avoid

### ❌ DON'T:
```bash
# Don't run artisan commands as root
sudo php artisan migrate

# Don't create log files as root
sudo touch storage/logs/custom.log

# Don't edit files in storage as root
sudo nano storage/logs/laravel.log

# Don't extract backups as root without fixing ownership
sudo unzip backup.zip -d /var/www/rentapplicaiton/backend/
```

### ✅ DO:
```bash
# Run artisan commands as www-data
sudo -u www-data php artisan migrate

# Create files as www-data
sudo -u www-data touch storage/logs/custom.log

# Edit files as www-data (or fix ownership after)
sudo -u www-data nano storage/logs/laravel.log

# Extract backups, then fix ownership
sudo unzip backup.zip -d /var/www/rentapplicaiton/backend/
sudo chown -R www-data:www-data /var/www/rentapplicaiton/backend/storage/
```

## 🔧 Quick Fix Commands

### Fix Everything After Working as Root
```bash
# One command to fix all permissions
sudo /var/www/rentapplicaiton/backend/fix-permissions.sh
```

### Fix Specific Directory
```bash
# Fix just logs
sudo chown -R www-data:www-data /var/www/rentapplicaiton/backend/storage/logs/
sudo chmod -R 775 /var/www/rentapplicaiton/backend/storage/logs/
```

### Fix Single File
```bash
# Fix one file
sudo chown www-data:www-data /var/www/rentapplicaiton/backend/storage/logs/probe.log
sudo chmod 664 /var/www/rentapplicaiton/backend/storage/logs/probe.log
```

## 💡 Pro Tips

### 1. Create an Alias
Add to your `~/.bashrc` or `~/.zshrc`:
```bash
alias fix-laravel-perms='sudo /var/www/rentapplicaiton/backend/fix-permissions.sh'
alias check-laravel-owner='find /var/www/rentapplicaiton/backend/storage ! -user www-data -ls'
```

Then just run:
```bash
fix-laravel-perms
check-laravel-owner
```

### 2. Set Up a Post-Command Hook
Create a function that always fixes permissions:
```bash
# Add to ~/.bashrc
laravel-work() {
    # Your commands here
    "$@"
    # Always fix permissions after
    sudo /var/www/rentapplicaiton/backend/fix-permissions.sh
}

# Usage
laravel-work sudo php artisan migrate
```

### 3. Use a Wrapper Script
Create `/usr/local/bin/laravel-safe`:
```bash
#!/bin/bash
# Run Laravel commands safely
sudo -u www-data php /var/www/rentapplicaiton/backend/artisan "$@"
```

Then use:
```bash
laravel-safe migrate
laravel-safe cache:clear
```

## 📊 Real-World Example

### Scenario: You need to manually create a log file

**❌ Wrong Way:**
```bash
# As root
sudo touch /var/www/rentapplicaiton/backend/storage/logs/custom.log
# File is now owned by root → PHP-FPM can't write → Errors!
```

**✅ Right Way:**
```bash
# Option 1: Create as www-data
sudo -u www-data touch /var/www/rentapplicaiton/backend/storage/logs/custom.log

# Option 2: Create as root, then fix
sudo touch /var/www/rentapplicaiton/backend/storage/logs/custom.log
sudo chown www-data:www-data /var/www/rentapplicaiton/backend/storage/logs/custom.log
sudo chmod 664 /var/www/rentapplicaiton/backend/storage/logs/custom.log

# Option 3: Create as root, fix everything
sudo touch /var/www/rentapplicaiton/backend/storage/logs/custom.log
sudo /var/www/rentapplicaiton/backend/fix-permissions.sh
```

## 🎯 Golden Rule

**"If you worked as root, always run the fix-permissions script before finishing!"**

```bash
# Make this a habit:
sudo /var/www/rentapplicaiton/backend/fix-permissions.sh
```

This single command will prevent 99% of permission issues!
