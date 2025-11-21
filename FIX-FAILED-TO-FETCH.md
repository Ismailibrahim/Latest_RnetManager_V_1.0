# Fix "Failed to fetch" Error

## The Problem
"Failed to fetch" means the frontend cannot connect to the backend API. This is usually because:

1. **Frontend hasn't been restarted** - `.env.local` changes require a restart
2. **CORS issue** - Backend is blocking requests from your phone's origin
3. **API URL still using localhost** - Frontend trying to connect to wrong URL

## Solution

### Step 1: RESTART FRONTEND (CRITICAL!)

The frontend server **MUST** be restarted to use the new `.env.local` file.

1. **Stop the current frontend server:**
   - Find the terminal running `npm run dev`
   - Press `Ctrl+C` to stop it

2. **Restart it:**
   ```powershell
   cd D:\Sandbox\Rent_V2\frontend
   npm run dev
   ```

3. **Verify it's using the correct API URL:**
   - Look at the terminal output
   - Check browser console (F12) - the API calls should go to `http://192.168.1.225:8000/api/v1`

### Step 2: Update Backend CORS

The backend needs to allow requests from your phone's origin.

1. **Open backend .env file:**
   - Location: `C:\laragon\www\Rent_V2_Backend\.env`

2. **Find or add this line:**
   ```
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.225:3000
   ```

3. **Restart backend** (in Laragon Terminal):
   ```bash
   cd C:\laragon\www\Rent_V2_Backend
   php artisan serve --host=0.0.0.0 --port=8000
   ```

### Step 3: Verify Configuration

After restarting both servers:

1. **Check frontend .env.local:**
   ```powershell
   type frontend\.env.local
   ```
   Should show: `NEXT_PUBLIC_API_URL=http://192.168.1.225:8000/api/v1`

2. **Check backend is accessible:**
   - Open browser: `http://192.168.1.225:8000/api/v1`
   - Should see API response

3. **Test on phone:**
   - Go to: `http://192.168.1.225:3000`
   - Try logging in
   - Check browser console (if possible) for errors

## Common Issues

### Issue: Frontend still using localhost
**Solution:** Make sure you restarted the frontend server after updating `.env.local`

### Issue: CORS error in browser console
**Solution:** Update backend CORS to include `http://192.168.1.225:3000`

### Issue: Network error
**Solution:** 
- Verify backend is running with `--host=0.0.0.0`
- Check firewall allows ports 3000 and 8000
- Make sure phone is on same Wi-Fi network

## Quick Checklist

- [ ] Frontend server restarted (after .env.local change)
- [ ] Backend CORS updated with your IP
- [ ] Backend restarted (after CORS change)
- [ ] Both servers running on network (0.0.0.0)
- [ ] Tested on phone: `http://192.168.1.225:3000`

