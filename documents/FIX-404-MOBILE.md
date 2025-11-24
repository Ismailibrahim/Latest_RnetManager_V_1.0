# Fix 404 Error on Mobile

## The Problem
You're getting a 404 error when accessing `http://192.168.1.225:3000` from your phone.

## Solution

The issue is likely that Next.js needs to be restarted with proper network binding. Here's how to fix it:

### Step 1: Stop Current Server
Close any terminal windows running `npm run dev` or press `Ctrl+C` in those windows.

### Step 2: Restart with Network Access

Open PowerShell in the frontend directory and run:

```powershell
cd D:\Sandbox\Rent_V2\frontend
$env:HOST = "0.0.0.0"
npm run dev
```

**OR** use the network script:

```powershell
cd D:\Sandbox\Rent_V2
.\restart-for-mobile.ps1
```

### Step 3: Verify Server Output

You should see output like:
```
▲ Next.js 16.0.1
- Local:        http://localhost:3000
- Network:      http://192.168.1.225:3000
```

If you see "Network: http://192.168.1.225:3000", it's working!

### Step 4: Try Again on Phone

On your phone, go to: `http://192.168.1.225:3000`

---

## Alternative: Check if App Requires Login

If you still get 404, the app might require authentication. Try:

1. **Login Page**: `http://192.168.1.225:3000/login`
2. **Check if there's a redirect**: The app might redirect to `/login` if not authenticated

---

## Still Not Working?

1. **Check Firewall**: Run `ALLOW-MOBILE-ACCESS.bat` as Administrator
2. **Verify IP**: Run `GET-MY-IP.bat` to confirm your IP hasn't changed
3. **Test from Laptop**: Try `http://192.168.1.225:3000` on your laptop browser first
4. **Check Server Logs**: Look at the terminal running `npm run dev` for any errors

---

## Quick Fix Script

I've created `restart-for-mobile.ps1` that does all of this automatically. Just run it!

