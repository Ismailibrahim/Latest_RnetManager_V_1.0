# How to Verify CORS is Working

## Step 1: Restart Backend Server

**CRITICAL:** You MUST restart the backend server for changes to take effect!

```bash
# Stop current server (Ctrl+C in the terminal running php artisan serve)
# Then start it again:
cd backend
php artisan serve
```

## Step 2: Clear Laravel Cache

```bash
cd backend
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```

## Step 3: Test CORS

### Option A: Use the Simple Test Page

1. Open in browser: `http://localhost:3000/test-cors-simple.html`
2. Click "Test OPTIONS Request"
3. Check if you see "✅ SUCCESS! CORS headers present"

### Option B: Test in Browser Console

Open browser console (F12) and run:

```javascript
fetch('http://localhost:8000/api/v1/admin/landlords', {
  method: 'OPTIONS',
  mode: 'cors',
  credentials: 'include'
}).then(r => {
  console.log('Status:', r.status);
  console.log('CORS Origin:', r.headers.get('Access-Control-Allow-Origin'));
  console.log('All Headers:', [...r.headers.entries()]);
});
```

### Option C: Check Laravel Logs

```bash
cd backend
tail -f storage/logs/laravel.log
```

Look for entries like:
```
CORS Middleware: OPTIONS preflight handled
```

If you see these logs, the middleware IS running!

## Step 4: Verify Middleware is Registered

Check that the middleware is in the stack:

```bash
cd backend
php artisan route:list --path=admin/landlords
```

## Troubleshooting

### If CORS headers are still missing:

1. **Check if backend is running:**
   - Open: http://localhost:8000/api/v1/cors-test
   - Should return JSON

2. **Check Laravel logs for errors:**
   ```bash
   cd backend
   tail -20 storage/logs/laravel.log
   ```

3. **Verify environment:**
   - Check `.env` file has `APP_ENV=local` or `APP_ENV=development`

4. **Test the OPTIONS route directly:**
   - Open: http://localhost:8000/api/v1/cors-options-test
   - Make an OPTIONS request in browser console

### If you see "Failed to fetch":

- Backend server is not running
- Backend crashed (check logs)
- Port 8000 is blocked
- Firewall is blocking the request

