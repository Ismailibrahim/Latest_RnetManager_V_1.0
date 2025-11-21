# How to Start Backend with Network Access

## The Problem
PHP is not in your PowerShell PATH, so `php` command doesn't work.

## Solution: Use Laragon Terminal

Laragon Terminal has PHP in its PATH automatically.

### Steps:

1. **Open Laragon** (if not already open)

2. **Click the "Terminal" button** in Laragon
   - Or press `Ctrl+Alt+T` in Laragon
   - This opens Laragon Terminal with PHP in PATH

3. **Navigate to backend directory:**
   ```bash
   cd C:\laragon\www\Rent_V2_Backend
   ```

4. **Start backend with network access:**
   ```bash
   php artisan serve --host=0.0.0.0 --port=8000
   ```

5. **Keep this terminal window open** while using the app

## Alternative: Use the Batch File

I've updated `start-backend-network.bat` to automatically find PHP in Laragon.

Just double-click: `start-backend-network.bat`

## Verify Backend is Running

After starting, check:
```powershell
netstat -ano | findstr ":8000" | findstr LISTENING
```

Should show: `0.0.0.0:8000` (NOT `127.0.0.1:8000`)

## Complete Setup Checklist

- [x] Frontend `.env.local` updated with IP address
- [ ] Backend started with `--host=0.0.0.0` (use Laragon Terminal)
- [ ] Frontend server restarted (to pick up .env.local changes)
- [ ] Both servers running and accessible from network
- [ ] Test on phone: `http://192.168.1.225:3000`

## Quick Reference

**Start Backend (Laragon Terminal):**
```bash
cd C:\laragon\www\Rent_V2_Backend
php artisan serve --host=0.0.0.0 --port=8000
```

**Restart Frontend:**
```powershell
cd D:\Sandbox\Rent_V2\frontend
npm run dev
```

**Access from Phone:**
```
http://192.168.1.225:3000
```

