# Mobile Access Guide

This guide explains how to:
1. **View the application on your mobile phone**
2. **Access your code from your phone**

---

## Part 1: Viewing the Application on Your Phone

### Step 1: Find Your Laptop's IP Address

1. Open **PowerShell** on your laptop
2. Run this command:
   ```powershell
   ipconfig
   ```
3. Look for **"IPv4 Address"** under your active network adapter (usually "Wireless LAN adapter Wi-Fi" or "Ethernet adapter")
   - Example: `192.168.1.100` or `192.168.0.50`
   - **Write down this IP address** - you'll need it!

### Step 2: Start Servers with Network Access

The servers need to be accessible on your local network (not just localhost).

#### Option A: Modify START-SERVERS.bat (Recommended)

I'll create a modified version that binds to your network IP.

#### Option B: Manual Start with Network Binding

**For Frontend (Next.js):**
```powershell
cd D:\Sandbox\Rent_V2\frontend
npm run dev -- -H 0.0.0.0
```

**For Backend (Laravel):**
```powershell
cd C:\laragon\www\Rent_V2_Backend
php artisan serve --host=0.0.0.0 --port=8000
```

### Step 3: Configure Firewall

Windows Firewall may block incoming connections. Allow access:

1. Open **Windows Defender Firewall** (search in Start menu)
2. Click **"Allow an app or feature through Windows Firewall"**
3. Click **"Change Settings"** (if needed)
4. Click **"Allow another app..."**
5. For **Node.js** (frontend):
   - Browse to: `C:\Program Files\nodejs\node.exe`
   - Check both **Private** and **Public** networks
6. For **PHP** (backend):
   - Browse to: `C:\laragon\bin\php\php-8.x.x\php.exe` (your PHP version)
   - Check both **Private** and **Public** networks

**OR** (Easier - Allow ports directly):
1. Open PowerShell as **Administrator**
2. Run these commands:
   ```powershell
   netsh advfirewall firewall add rule name="Next.js Dev Server" dir=in action=allow protocol=TCP localport=3000
   netsh advfirewall firewall add rule name="Laravel Backend" dir=in action=allow protocol=TCP localport=8000
   ```

### Step 4: Access from Your Phone

1. **Make sure your phone is on the same Wi-Fi network as your laptop**
2. Open your phone's browser
3. Navigate to:
   - **Frontend**: `http://YOUR_LAPTOP_IP:3000`
     - Example: `http://192.168.1.100:3000`
   - **Backend API**: `http://YOUR_LAPTOP_IP:8000`
     - Example: `http://192.168.1.100:8000`

### Step 5: Update Frontend to Use Network IP for API Calls

If the frontend can't connect to the backend, you may need to update the API URL:

1. Create or edit `frontend/.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://YOUR_LAPTOP_IP:8000/api/v1
   ```
   Replace `YOUR_LAPTOP_IP` with your actual IP (e.g., `192.168.1.100`)

2. Restart the frontend server

---

## Part 2: Accessing Code from Your Phone

### Option 1: Remote Desktop (Full Control)

**Windows Remote Desktop:**
1. On your laptop: Settings → System → Remote Desktop → Enable
2. On your phone: Install **Microsoft Remote Desktop** app (iOS/Android)
3. Connect using your laptop's IP address and Windows credentials

**Pros:** Full access to everything
**Cons:** Requires good connection, may be slow

### Option 2: File Sharing (View/Edit Files)

**Windows File Sharing:**
1. Right-click your project folder: `D:\Sandbox\Rent_V2`
2. Properties → Sharing → Share
3. Add "Everyone" with Read/Write permissions
4. On your phone: Use a file manager app that supports SMB/CIFS:
   - **Android**: ES File Explorer, Solid Explorer, or Files by Google
   - **iOS**: Files app (built-in) or FileBrowser
5. Connect to: `\\YOUR_LAPTOP_IP\Rent_V2`

### Option 3: Cloud Sync (Recommended for Code)

**GitHub/GitLab:**
1. Push your code to a repository
2. On your phone: Use GitHub mobile app or web browser
3. View/edit files directly

**VS Code Remote:**
1. Install **VS Code Server** on your laptop
2. On your phone: Use **VS Code for Mobile** or **Code Server** web interface
3. Access via: `http://YOUR_LAPTOP_IP:8080`

### Option 4: Mobile Code Editors

**For Viewing/Editing:**
- **Android**: QuickEdit, DroidEdit, or Acode
- **iOS**: Textastic, Buffer Editor, or Working Copy (Git)

Connect via:
- **FTP/SFTP**: Use FileZilla Server on laptop
- **WebDAV**: Use IIS or Apache on laptop
- **Git**: Clone repository on phone

### Option 5: Terminal Access (Advanced)

**SSH Server on Windows:**
1. Enable OpenSSH Server (Settings → Apps → Optional Features)
2. On your phone: Use **Termius**, **JuiceSSH**, or **ConnectBot**
3. SSH to: `YOUR_LAPTOP_IP` with your Windows username/password

---

## Quick Reference

### Your Laptop IP Address
Run this to find it anytime:
```powershell
ipconfig | findstr IPv4
```

### Test Connection from Phone
1. Open browser on phone
2. Visit: `http://YOUR_LAPTOP_IP:3000`
3. If it works, you'll see your app!

### Troubleshooting

**Can't access from phone:**
- ✅ Check both devices are on same Wi-Fi
- ✅ Check firewall rules are added
- ✅ Check servers are running with `-H 0.0.0.0` or `--host=0.0.0.0`
- ✅ Try disabling Windows Firewall temporarily to test
- ✅ Check your router doesn't have AP isolation enabled

**Connection refused:**
- Make sure servers are actually running
- Check ports 3000 and 8000 are not blocked
- Try accessing from laptop first: `http://localhost:3000`

**Slow performance:**
- Normal for development servers over Wi-Fi
- Consider using a wired connection for better speed

---

## Recommended Setup

**For Development:**
1. Use **GitHub** for code access (easiest)
2. Use **network binding** for app testing on phone
3. Use **VS Code Remote** if you need full IDE access

**For Quick Testing:**
1. Just use network binding (`-H 0.0.0.0`)
2. Access app via `http://YOUR_IP:3000` on phone
3. No code access needed for testing UI

