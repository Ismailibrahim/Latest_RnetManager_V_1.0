# Backend Server Verification Guide

## Quick Start

1. **Start the Backend Server:**
   ```bash
   cd backend
   php artisan serve
   ```
   
   Or double-click: `START_SERVER.bat`

2. **Verify Server is Running:**
   - Open browser: http://localhost:8000/api/v1/health
   - Should see: `{"status":"healthy","timestamp":"...","database":"connected"}`

3. **Test Signups Endpoint:**
   - Make sure you're logged in as super admin
   - Navigate to: http://localhost:3000/admin/signups

## Troubleshooting

### Server Won't Start
- Check if port 8000 is already in use:
  ```bash
  netstat -ano | findstr ":8000"
  ```
- Kill the process if needed, then restart

### "Failed to Fetch" Error
1. **Check backend is running:**
   - Open: http://localhost:8000/api/v1/health
   - Should return JSON, not "connection refused"

2. **Check CORS:**
   - Backend CORS is configured to allow `http://localhost:3000`
   - Check `backend/config/cors.php`

3. **Check API URL:**
   - Frontend uses: `http://localhost:8000/api/v1`
   - Verify in browser console what URL is being called

4. **Check Browser Console:**
   - Open DevTools (F12) → Network tab
   - Look for the `/admin/signups` request
   - Check the error details

### Database Issues
- Run migrations: `php artisan migrate --force`
- Check database connection in `.env` file

## Manual Server Start

If background process doesn't work, start server manually:

1. Open a new terminal/command prompt
2. Navigate to backend directory:
   ```bash
   cd D:\Sandbox\Rent_V2\backend
   ```
3. Start the server:
   ```bash
   php artisan serve
   ```
4. Keep this terminal open - server runs in foreground
5. Test in browser: http://localhost:8000/api/v1/health
