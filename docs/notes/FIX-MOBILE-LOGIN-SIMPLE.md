# Fix Mobile Login - Simple Steps

## The Problem
When accessing from your phone, the frontend tries to connect to `http://localhost:8000/api/v1`, but `localhost` on your phone refers to the phone itself, not your laptop!

## Solution

### Step 1: Update Frontend API URL ✅ DONE
I've updated `frontend/.env.local` to use your laptop's IP:
```
NEXT_PUBLIC_API_URL=http://192.168.1.225:8000/api/v1
```

### Step 2: Restart Frontend Server
The frontend needs to be restarted to pick up the new environment variable:

```powershell
# Stop current server (Ctrl+C in the terminal running npm run dev)
# Then restart:
cd D:\Sandbox\Rent_V2\frontend
npm run dev
```

### Step 3: Make Sure Backend is Running with Network Access
The backend must be accessible from your network:

```powershell
cd C:\laragon\www\Rent_V2_Backend
php artisan serve --host=0.0.0.0 --port=8000
```

### Step 4: Update Backend CORS (If Needed)
If you get CORS errors, update the backend `.env` file:

Location: `C:\laragon\www\Rent_V2_Backend\.env`

Add or update:
```
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.225:3000
```

Then restart the backend server.

### Step 5: Test on Phone
1. Make sure both servers are running
2. On your phone, go to: `http://192.168.1.225:3000`
3. Try logging in

## Quick Checklist
- [x] Frontend `.env.local` updated with laptop IP
- [ ] Frontend server restarted
- [ ] Backend server running with `--host=0.0.0.0`
- [ ] Backend CORS updated (if needed)
- [ ] Firewall allows ports 3000 and 8000

## If Still Not Working

1. **Check browser console on phone** (if possible):
   - Look for CORS errors
   - Look for network errors
   - Check if API calls are going to the right URL

2. **Test backend directly from phone**:
   - Try: `http://192.168.1.225:8000/api/v1`
   - Should see API response or error

3. **Verify IP hasn't changed**:
   - Run: `ipconfig | findstr IPv4`
   - Update `.env.local` if IP changed

