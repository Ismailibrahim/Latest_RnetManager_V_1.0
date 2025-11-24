# 🚀 Production Setup Guide

Complete guide for setting up RentApplication in production.

## Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- Root or sudo access
- Domain name (optional but recommended)
- SSH access to server

## Quick Setup

```bash
# Run automated setup
chmod +x scripts/setup-server.sh
./scripts/setup-server.sh
```

## Manual Setup Steps

### 1. Server Setup

See `scripts/setup-server.sh` for automated setup or follow manual steps in `docs/DEPLOYMENT_STEP_BY_STEP.md`.

### 2. Queue Workers Setup

**Critical for email/SMS notifications and background jobs.**

```bash
# Run queue worker setup script
sudo chmod +x scripts/setup-queue-worker.sh
sudo ./scripts/setup-queue-worker.sh
```

This will:
- Install Supervisor
- Configure queue workers
- Start workers automatically
- Set up auto-restart on failure

**Verify:**
```bash
sudo supervisorctl status rentapp-queue-worker:*
```

### 3. Scheduled Tasks Setup

**Critical for automated rent invoices and notifications.**

Add to crontab:
```bash
sudo crontab -e
```

Add this line:
```
* * * * * cd /var/www/webapp/backend && php artisan schedule:run >> /dev/null 2>&1
```

**Verify:**
```bash
cd /var/www/webapp/backend
php artisan schedule:list
```

### 4. Database Backups

**Set up automated daily backups:**

```bash
# Make script executable
chmod +x scripts/backup-database.sh

# Add to crontab for daily backups at 2 AM
sudo crontab -e
```

Add:
```
0 2 * * * /var/www/webapp/scripts/backup-database.sh >> /var/www/webapp/backups/database/backup.log 2>&1
```

**Manual backup:**
```bash
./scripts/backup-database.sh
```

### 5. Storage Link

**Required for file uploads to be accessible:**

Already included in deployment script, but can run manually:
```bash
cd /var/www/webapp/backend
php artisan storage:link
```

### 6. Email Configuration

**For production email sending:**

Update `backend/.env`:
```env
MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host.com
MAIL_PORT=587
MAIL_USERNAME=your-email@domain.com
MAIL_PASSWORD=your-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME="RentApplication"
```

**Test email:**
```bash
cd /var/www/webapp/backend
php artisan tinker
Mail::raw('Test email', function($msg) { $msg->to('test@example.com')->subject('Test'); });
```

### 7. SMS Configuration

**For SMS notifications:**

Update `backend/.env`:
```env
MSG_OWL_KEY=your-msg-owl-api-key
```

Configure in admin panel: Settings → SMS

### 8. SSL/HTTPS Setup

**Using Let's Encrypt (Free SSL):**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (already set up by certbot)
sudo certbot renew --dry-run
```

### 9. Monitoring Setup

**Health Checks:**
- Endpoint: `https://yourdomain.com/api/health`
- Detailed: `https://yourdomain.com/api/v1/health/diagnostics` (requires auth)

**External Monitoring:**
- Set up UptimeRobot, Pingdom, or similar
- Monitor: `https://yourdomain.com/api/health`
- Alert on HTTP 503 or timeout

### 10. Log Monitoring

**View logs:**
```bash
# Application logs
tail -f /var/www/webapp/backend/storage/logs/laravel.log

# Queue worker logs
tail -f /var/www/webapp/backend/storage/logs/queue-worker.log

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Production Checklist

- [ ] Server setup complete
- [ ] Application deployed
- [ ] Database configured and migrated
- [ ] Queue workers running
- [ ] Scheduled tasks configured (cron)
- [ ] Database backups automated
- [ ] Storage link created
- [ ] Email configured and tested
- [ ] SMS configured (if using)
- [ ] SSL certificate installed
- [ ] Health checks working
- [ ] Monitoring set up
- [ ] Log rotation configured
- [ ] Firewall configured
- [ ] Regular security updates scheduled

## Maintenance Commands

```bash
# Check application status
cd /var/www/webapp/backend
php artisan about

# Check queue status
sudo supervisorctl status rentapp-queue-worker:*

# Check scheduled tasks
php artisan schedule:list

# View failed jobs
php artisan queue:failed

# Retry failed jobs
php artisan queue:retry all

# Clear cache
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Optimize
php artisan optimize

# Check logs
tail -f storage/logs/laravel.log
```

## Troubleshooting

### Queue Workers Not Processing

```bash
# Check status
sudo supervisorctl status rentapp-queue-worker:*

# Restart workers
sudo supervisorctl restart rentapp-queue-worker:*

# Check logs
tail -f /var/www/webapp/backend/storage/logs/queue-worker.log
```

### Scheduled Tasks Not Running

```bash
# Check cron is running
sudo systemctl status cron

# Test schedule manually
cd /var/www/webapp/backend
php artisan schedule:run

# Check schedule list
php artisan schedule:list
```

### Email Not Sending

1. Check queue workers are running
2. Check email configuration in `.env`
3. Check failed jobs: `php artisan queue:failed`
4. Test email manually (see Email Configuration above)

### Files Not Accessible

```bash
# Recreate storage link
cd /var/www/webapp/backend
php artisan storage:link

# Check permissions
ls -la public/storage
```

## Security Recommendations

1. **Firewall:**
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

2. **Regular Updates:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Database Security:**
   - Use strong passwords
   - Limit database user privileges
   - Don't expose MySQL port publicly

4. **Application Security:**
   - Keep `APP_DEBUG=false` in production
   - Use strong `APP_KEY`
   - Regularly update dependencies

## Support

For issues:
1. Check logs
2. Review health endpoints
3. Check queue worker status
4. Verify scheduled tasks
5. Review deployment documentation

---

**Last Updated:** Generated during codebase review

