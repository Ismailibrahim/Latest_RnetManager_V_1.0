# 🚨 Server Compromise - Incident Response Guide

## ⚠️ **IF YOUR SERVER IS COMPROMISED, YES - FORMAT & REINSTALL IS RECOMMENDED**

**Why?** Once compromised, you cannot trust:
- The operating system
- Installed software
- System binaries
- Configuration files
- Running processes

Attackers can install persistent backdoors, rootkits, and hidden malware that are extremely difficult to detect and remove completely.

---

## 🔍 **Step 1: Confirm Compromise (Before Acting)**

### Signs of Compromise:

✅ **Check for Cryptomining Indicators:**
```bash
# Check CPU usage (should be normal for your app)
top
# Look for: xmrig, cryptominer, mining, cpu-mining processes

# Check suspicious processes
ps aux | grep -E 'xmrig|cryptominer|mining|stratum|pool'

# Check network connections to known mining pools
netstat -an | grep -E '185\.|pool|stratum|hashvault'
ss -tulpn | grep -E '185\.|pool|stratum'
```

✅ **Check for Unusual Activity:**
```bash
# Unexpected processes running as root
ps aux | grep root

# Unexpected network connections
netstat -tulpn
ss -tulpn

# Unusual cron jobs (automated tasks)
crontab -l
cat /etc/crontab
ls -la /etc/cron.*

# Modified system files
find /bin /usr/bin /sbin /usr/sbin -type f -newer /var/log/lastlog

# Suspicious user accounts
cat /etc/passwd
cat /etc/shadow

# Unusual logins
last
lastlog
grep "Failed password" /var/log/auth.log
```

✅ **Check Docker Containers:**
```bash
# List all containers (running and stopped)
docker ps -a

# Check for suspicious images
docker images

# Check container resource usage
docker stats

# Inspect suspicious containers
docker inspect <container_id>
docker logs <container_id>
```

✅ **Check System Resources:**
```bash
# High CPU usage without expected load
htop
top

# High memory usage
free -h

# Disk space issues
df -h
du -sh /*

# Network traffic spikes
iftop
nethogs
```

---

## 🛑 **Step 2: Immediate Response (If Compromised)**

### A. Isolate the Server
```bash
# 1. DISCONNECT FROM INTERNET (if possible)
# Physical: Unplug network cable
# OR Software: Block all traffic
sudo iptables -P INPUT DROP
sudo iptables -P OUTPUT DROP

# 2. Stop all Docker containers
docker-compose down

# 3. Stop services
sudo systemctl stop docker
sudo systemctl stop nginx
sudo systemctl stop mysql
```

### B. Document Evidence (Before Wiping)
```bash
# Save logs for analysis
mkdir -p ~/incident_evidence
cp -r /var/log/* ~/incident_evidence/logs/
docker ps -a > ~/incident_evidence/docker_containers.txt
docker images > ~/incident_evidence/docker_images.txt
ps aux > ~/incident_evidence/running_processes.txt
netstat -tulpn > ~/incident_evidence/network_connections.txt
history > ~/incident_evidence/command_history.txt

# Backup to external drive/USB
# DO NOT backup to another server on the same network
```

---

## 🔄 **Step 3: Clean Reinstall Process**

### **YES - Format and Reinstall is the SAFEST Approach**

### Process:

#### **3.1. Backup Data (Clean Data Only)**
```
✅ Backup (SAFE):
- Application source code (from Git repository - FRESH PULL)
- Database exports (mysqldump - verify they're clean)
- Environment variable files (.env - review carefully)
- Configuration files (review before restoring)

❌ DO NOT Backup (Potentially Compromised):
- System binaries (/bin, /usr/bin, /sbin)
- System configuration (/etc/*)
- Installed packages (node_modules, vendor/)
- Docker images/containers
- Any executables or binaries
```

#### **3.2. Format and Reinstall OS**

**For Linux Servers (Ubuntu/Debian):**
1. Boot from fresh installation media (USB/DVD)
2. **COMPLETE FORMAT** of all partitions
3. Install fresh OS
4. Apply all security updates immediately
5. Configure firewall before connecting to internet

**For Windows Servers:**
1. Boot from Windows installation media
2. Delete all partitions
3. Create fresh partition and install
4. Apply all Windows Updates
5. Configure Windows Firewall

#### **3.3. Secure Base System**
```bash
# Ubuntu/Debian Fresh Install:

# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install security essentials
sudo apt install -y ufw fail2ban unattended-upgrades

# 3. Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH (change port if possible)
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# 4. Configure fail2ban (prevent brute force)
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# 5. Disable root login (if using SSH)
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart sshd

# 6. Create non-root user for application
sudo adduser appuser
sudo usermod -aG sudo appuser

# 7. Set up automatic security updates
sudo dpkg-reconfigure -plow unattended-upgrades
```

#### **3.4. Reinstall Application (Clean)**

```bash
# 1. Install Git
sudo apt install -y git

# 2. Clone FRESH from repository (not from backup)
git clone https://github.com/your-repo/Rent_V2.git

# 3. Install dependencies FRESH
cd Rent_V2/frontend
npm ci  # Clean install, no cache

# 4. Review all configuration files
# Check .env files for suspicious entries
# Review docker-compose.yml
# Verify all settings

# 5. Install Docker (if using)
# Follow official Docker installation guide
# DO NOT use any Docker images from before compromise

# 6. Change ALL passwords:
# - Database passwords
# - API keys
# - JWT secrets
# - SSH keys (generate new)
# - SSL certificates (if compromised)

# 7. Build from scratch
docker-compose build --no-cache

# 8. Restore ONLY clean data
# Import database dumps (verify clean)
# Restore application files from Git
```

---

## 🔒 **Step 4: Post-Reinstall Hardening**

### **Security Checklist:**

- [ ] ✅ All packages updated: `npm update`, `apt upgrade`
- [ ] ✅ Security audit: `npm audit` shows 0 vulnerabilities
- [ ] ✅ Firewall configured and enabled
- [ ] ✅ SSH secured (disable root, use keys)
- [ ] ✅ Fail2ban configured
- [ ] ✅ Automatic security updates enabled
- [ ] ✅ Database ports NOT exposed to internet
- [ ] ✅ Docker running as non-root
- [ ] ✅ All passwords changed
- [ ] ✅ SSL certificates renewed
- [ ] ✅ Monitoring/alerts configured
- [ ] ✅ Backups configured (to secure location)
- [ ] ✅ Log monitoring enabled

### **Set Up Monitoring:**

```bash
# Monitor CPU usage
# Set up alerts for >80% CPU for >5 minutes

# Monitor network connections
# Alert on connections to known malicious IPs

# Monitor disk usage
# Alert on unexpected growth

# Monitor login attempts
# Use fail2ban for automatic blocking
```

---

## 📊 **Alternative: Partial Recovery (If Format Not Possible)**

**⚠️ ONLY if you CANNOT format the server:**

This is **RISKIER** but may work if:
- You have critical data that can't be restored
- Server is needed immediately
- You can thoroughly verify each step

### Process:

1. **Stop Everything**
   ```bash
   docker-compose down
   docker system prune -a --volumes  # Remove ALL Docker data
   ```

2. **Fresh Install Only Application:**
   ```bash
   # Remove old application
   rm -rf /path/to/application
   
   # Fresh clone from Git
   git clone <repo>
   
   # Fresh npm install
   npm ci
   ```

3. **Scan System:**
   ```bash
   # Install security tools
   sudo apt install -y rkhunter chkrootkit clamav
   
   # Scan for rootkits
   sudo rkhunter --check
   sudo chkrootkit
   
   # Scan for malware
   sudo freshclam
   sudo clamscan -r /
   ```

4. **Monitor Heavily:**
   - Watch all processes
   - Monitor all network connections
   - Log everything
   - Be ready to format if anything suspicious appears

**⚠️ Warning:** This approach may miss hidden backdoors or rootkits. Format is still recommended.

---

## 🚫 **What NOT to Do**

❌ **DO NOT:**
- Keep running the compromised server
- Just "restart" and hope it's fixed
- Restore from old backups without verification
- Reuse old Docker images
- Reuse old SSH keys or certificates
- Connect compromised server to other systems
- Copy binaries or executables from old system

---

## 📞 **Next Steps**

1. **If Compromised:** Follow this guide, format, and reinstall
2. **After Clean Install:** Review `SECURITY.md` for ongoing security
3. **Set Up Monitoring:** Prevent future compromises
4. **Regular Audits:** Run `npm audit` weekly
5. **Keep Updated:** Apply security patches immediately

---

## 🔍 **How to Verify Server is Clean**

After reinstall, verify:
```bash
# No suspicious processes
ps aux | grep -vE '^root|^www-data|^mysql|^docker'

# No unexpected network connections
netstat -tulpn

# Normal CPU usage
top

# No unknown services
systemctl list-units --type=service

# Clean Docker
docker ps -a  # Should only show YOUR containers
docker images # Should only show YOUR images
```

---

**Remember:** The time spent on a clean reinstall is MUCH less than dealing with persistent compromise, stolen data, or ransomware.

