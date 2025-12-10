# Security Guide

## 🔐 Current Security Status

### ✅ React/Next.js Vulnerability (CVE-2025-55182 / React2Shell)
- **Status**: **PATCHED**
- React: 19.2.1 (Not vulnerable - vulnerability affects React 18.0.0-18.3.4)
- Next.js: 16.0.8 (PATCHED - vulnerability affects Next.js < 16.0.7)

### ⚠️ Known Vulnerabilities

Run `npm audit` regularly to check for new vulnerabilities:
```bash
cd frontend
npm audit
```

## 🛡️ Security Best Practices

### 1. Dependency Management
- **Regular Updates**: Run `npm outdated` weekly and update dependencies
- **Security Audits**: Run `npm audit` before each deployment
- **Auto-fix**: Use `npm audit fix` for non-breaking security updates

```bash
# Check for outdated packages
npm outdated

# Check for vulnerabilities
npm audit

# Fix automatically (safe fixes only)
npm audit fix
```

### 2. Docker Security Hardening

#### ✅ Database Port Security
**CRITICAL**: The MySQL database port (3306) should NOT be exposed to the host in production.

**Current Configuration** (`docker-compose.yml`):
- Database port is commented out by default for security
- Only expose if you need direct database access (development only)

**Production Fix**:
```yaml
mysql:
  # Remove or comment out ports section entirely in production
  # ports:
  #   - "3306:3306"
```

#### ✅ Run Containers as Non-Root
All Dockerfiles now run as non-root users to limit damage if breached.

#### ✅ Firewall Configuration
Only expose necessary ports:
- **HTTP/HTTPS**: 80, 443 (via Nginx)
- **Development**: 3000 (frontend), 8000 (backend) - LOCAL ONLY
- **Database**: 3306 - NEVER expose to internet

### 3. Server Security Measures

#### Monitor CPU Usage
Cryptojacking attacks cause sustained high CPU usage:
```bash
# Monitor CPU usage
top
htop
```

**Alert Threshold**: CPU > 80% for > 5 minutes without expected load

#### Monitor Network Connections
Watch for connections to known crypto mining pools:
```bash
# Check active connections
netstat -tulpn

# Monitor outbound connections
ss -tulpn
```

#### Firewall Rules (Linux - ufw)
```bash
# Allow only HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny everything else
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Enable firewall
sudo ufw enable
```

#### Firewall Rules (Windows)
```powershell
# Allow only HTTP/HTTPS
New-NetFirewallRule -DisplayName "Allow HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "Allow HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# Block database port from internet
New-NetFirewallRule -DisplayName "Block MySQL" -Direction Inbound -Protocol TCP -LocalPort 3306 -Action Block
```

### 4. Environment Variables
**NEVER commit** sensitive data:
- Database passwords
- API keys
- JWT secrets
- Session secrets

Use `.env` files (already in `.gitignore`)

### 5. Production Deployment Checklist

- [ ] Update all dependencies: `npm update`
- [ ] Run security audit: `npm audit`
- [ ] Remove database port exposure in docker-compose.yml
- [ ] Configure firewall to block unnecessary ports
- [ ] Set up CPU/memory monitoring alerts
- [ ] Enable HTTPS/SSL certificates
- [ ] Use strong database passwords
- [ ] Review and limit file permissions
- [ ] Enable rate limiting on API endpoints
- [ ] Set up log monitoring for suspicious activity

### 6. Incident Response

If you suspect a breach:

1. **Immediate Actions**:
   ```bash
   # Stop all containers
   docker-compose down
   
   # Check for suspicious processes
   ps aux | grep -E 'xmrig|cryptominer|mining'
   
   # Check network connections
   netstat -an | grep ESTABLISHED
   ```

2. **Investigation**:
   - Review logs: `docker-compose logs`
   - Check for unexpected containers: `docker ps -a`
   - Review system logs: `/var/log/`

3. **Recovery**:
   - Update all packages
   - Change all passwords
   - Review and patch vulnerabilities
   - Restore from clean backup if compromised

## 📚 Additional Resources

- [Next.js Security Documentation](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [React Security Best Practices](https://react.dev/learn/escape-hatches)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)

## 🚨 If Server is Compromised

**See `INCIDENT_RESPONSE_GUIDE.md` for detailed step-by-step instructions.**

**Quick Answer:** YES - Format and reinstall is the **SAFEST** approach. Once compromised, you cannot trust the system.

**Immediate Actions:**
1. Disconnect from internet
2. Document evidence
3. Format and reinstall OS
4. Restore clean data from Git (NOT from backups)
5. Change ALL passwords and keys
6. Review SECURITY.md hardening checklist

**Never:**
- Keep running compromised server
- Restore old binaries or executables
- Reuse old Docker images
- Copy files from compromised system

## 🔔 Security Updates

**Last Security Audit**: Weekly (recommended)
**Next Scheduled Audit**: Weekly

To receive security alerts:
- Monitor GitHub security advisories
- Subscribe to npm security updates
- Enable Dependabot alerts in GitHub

