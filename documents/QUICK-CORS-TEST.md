# Quick CORS Test Guide

## Your API is Working! ✅

You got: `{"status":"ok","message":"RentApplicaiton API v1 online"}`

This means the backend is running and responding. Now let's verify CORS headers.

## Quick Test in Browser

### Option 1: Browser Console Test

Open browser console (F12) and run:

```javascript
// Test OPTIONS request
fetch('http://localhost:8000/api/v1/admin/landlords', {
  method: 'OPTIONS',
  mode: 'cors'
}).then(r => {
  console.log('Status:', r.status);
  console.log('CORS Origin:', r.headers.get('Access-Control-Allow-Origin'));
  console.log('All Headers:', [...r.headers.entries()]);
});
```

**Expected Result:**
- Status: 204
- CORS Origin: `http://localhost:3000` (or your origin)
- Should see `Access-Control-Allow-Origin` header

### Option 2: Use Test Page

Open: `http://localhost:3000/test-cors-simple.html`

Click "Test OPTIONS Request" button.

### Option 3: Test Direct Endpoint

Open browser console and run:

```javascript
fetch('http://localhost:8000/api/v1/cors-options-test', {
  method: 'OPTIONS'
}).then(r => {
  console.log('Status:', r.status);
  console.log('CORS Headers:', {
    origin: r.headers.get('Access-Control-Allow-Origin'),
    methods: r.headers.get('Access-Control-Allow-Methods'),
    headers: r.headers.get('Access-Control-Allow-Headers')
  });
});
```

## What to Look For

✅ **SUCCESS:** You see `Access-Control-Allow-Origin` header in response
❌ **FAILED:** No CORS headers, or "Failed to fetch" error

## If CORS Headers Are Missing

1. **Check if middleware is running:**
   - Look in `backend/storage/logs/laravel.log`
   - Search for "CORS Middleware: RUNNING"
   - If not found, middleware isn't running

2. **Restart backend server:**
   - Stop (Ctrl+C)
   - Clear caches: Run `backend/clear-caches.bat`
   - Start: `php artisan serve`

3. **Check environment:**
   - Make sure `.env` has `APP_ENV=local`

## Next Steps

Once CORS is working, you should be able to:
- Access the admin panel at `/admin/subscriptions`
- Make API requests from the frontend
- See CORS headers in browser Network tab

Try the browser console test above and let me know what you see!

