# Troubleshooting Steps

## Issue: Frontend can't connect to Backend

### Quick Fix Steps:

1. **Update Backend CORS Configuration**
   - File: `C:\laragon\www\Rent_V2_Backend\.env`
   - Ensure `CORS_ALLOWED_ORIGINS` includes `http://localhost:3000`
   - Current value should be: `CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost,http://127.0.0.1`

2. **Restart Backend Server**
   - Stop the current backend server (Ctrl+C in the terminal)
   - Restart it: `php artisan serve`

3. **Check Both Servers Are Running**
   - Backend: http://localhost:8000/api/v1/health
   - Frontend: http://localhost:3000

4. **Clear Browser Cache & LocalStorage**
   - Open browser DevTools (F12)
   - Go to Application tab
   - Clear LocalStorage
   - Refresh the page

5. **Verify Authentication**
   - Make sure you're logged in
   - Check if `auth_token` exists in LocalStorage

6. **Check Browser Console**
   - Open DevTools (F12)
   - Check Console tab for any CORS errors
   - Check Network tab to see API request status

### Common Errors:

- **CORS Error**: Backend CORS not configured correctly
- **401 Unauthorized**: Need to log in first
- **Connection Refused**: Backend server not running
- **404 Not Found**: Wrong API URL or endpoint

### Testing Commands:

```powershell
# Test backend health
curl http://localhost:8000/api/v1/health

# Check if backend is running
Test-NetConnection -ComputerName localhost -Port 8000

# Check if frontend is running
Test-NetConnection -ComputerName localhost -Port 3000
```

