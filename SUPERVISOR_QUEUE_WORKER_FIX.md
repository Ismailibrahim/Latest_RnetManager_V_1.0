# Supervisor Queue Worker Fix

## Issue

When trying to start queue workers with Supervisor, you get:
```
rentapp-queue-worker: ERROR (no such group)
```

## Root Cause

When using `numprocs=2` in Supervisor, it creates processes with specific names. The `:*` syntax doesn't work as expected in some Supervisor versions.

## Solution

### Step 1: Verify Configuration File

Check your Supervisor config file:

```bash
sudo cat /etc/supervisor/conf.d/rentapp-queue-worker.conf
```

It should look like this:

```ini
[program:rentapp-queue-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/rentapplicaiton/backend/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/rentapplicaiton/backend/storage/logs/queue-worker.log
stopwaitsecs=3600
```

**Important:** Make sure the paths are correct:
- `command=php /var/www/rentapplicaiton/backend/artisan queue:work ...`
- `stdout_logfile=/var/www/rentapplicaiton/backend/storage/logs/queue-worker.log`

### Step 2: Fix Configuration (if needed)

If the paths are wrong, edit the file:

```bash
sudo nano /etc/supervisor/conf.d/rentapp-queue-worker.conf
```

Update the paths to match your installation directory (`/var/www/rentapplicaiton`).

### Step 3: Reload Supervisor

```bash
sudo supervisorctl reread
sudo supervisorctl update
```

### Step 4: Start Workers (Correct Syntax)

**Option A: Start all processes individually**

```bash
sudo supervisorctl start rentapp-queue-worker:rentapp-queue-worker_00
sudo supervisorctl start rentapp-queue-worker:rentapp-queue-worker_01
```

**Option B: Start using group syntax (if supported)**

```bash
sudo supervisorctl start rentapp-queue-worker:*
```

**Option C: Start all at once**

```bash
sudo supervisorctl start all
```

### Step 5: Check Status

```bash
# Check all processes
sudo supervisorctl status

# Check specific worker
sudo supervisorctl status rentapp-queue-worker:rentapp-queue-worker_00
sudo supervisorctl status rentapp-queue-worker:rentapp-queue-worker_01

# Or check all rentapp processes
sudo supervisorctl status | grep rentapp
```

## Alternative: Single Worker Configuration

If you're having issues with multiple workers, you can use a single worker:

```bash
sudo nano /etc/supervisor/conf.d/rentapp-queue-worker.conf
```

Change `numprocs=2` to `numprocs=1` and remove the `process_name` line:

```ini
[program:rentapp-queue-worker]
command=php /var/www/rentapplicaiton/backend/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/www/rentapplicaiton/backend/storage/logs/queue-worker.log
stopwaitsecs=3600
```

Then:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start rentapp-queue-worker
sudo supervisorctl status rentapp-queue-worker
```

## Verify Workers Are Running

```bash
# Check Supervisor status
sudo supervisorctl status

# Check Laravel queue
cd /var/www/rentapplicaiton/backend
php artisan queue:work --help

# Check logs
tail -f /var/www/rentapplicaiton/backend/storage/logs/queue-worker.log
```

## Troubleshooting

### If workers don't start:

1. **Check Supervisor logs:**
   ```bash
   sudo tail -f /var/log/supervisor/supervisord.log
   ```

2. **Check if PHP path is correct:**
   ```bash
   which php
   # Update command in config if needed
   ```

3. **Check file permissions:**
   ```bash
   ls -la /var/www/rentapplicaiton/backend/storage/logs/
   sudo chown -R www-data:www-data /var/www/rentapplicaiton/backend/storage
   ```

4. **Test command manually:**
   ```bash
   sudo -u www-data php /var/www/rentapplicaiton/backend/artisan queue:work --once
   ```

### Common Commands

```bash
# Restart all workers
sudo supervisorctl restart rentapp-queue-worker:*

# Stop all workers
sudo supervisorctl stop rentapp-queue-worker:*

# Reload Supervisor config
sudo supervisorctl reread
sudo supervisorctl update

# View logs
sudo supervisorctl tail -f rentapp-queue-worker:rentapp-queue-worker_00
```

