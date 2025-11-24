# CORS Debugging Steps

## Current Status
- ✅ Backend IS running (confirmed)
- ❌ OPTIONS request returns "Failed to fetch"
- ❌ GET request returns "Failed to fetch"

## The Problem

"Failed to fetch" in browser usually means:
1. **CORS preflight failed** - Browser blocked the request
2. **Network error** - Request never reached server
3. **Server error** - Server returned error that browser interpreted as network failure

## Debug Steps

### 1. Test OPTIONS Directly (Server-Side)

Run this PHP script to test OPTIONS without browser:

```bash
cd backend
php test-options-direct.php
```

This will show:
- If OPTIONS route is matching
- What status code is returned
- What headers are set
- Any errors

### 2. Check Browser Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Try the OPTIONS request again
4. Look at the request:
   - **Status code?** (Should be 204)
   - **Request URL?** (Should be correct)
   - **Request Headers?** (Should include Origin)
   - **Response Headers?** (Should include CORS headers)
   - **Error message?** (What does it say?)

### 3. Check Laravel Logs

```bash
cd backend
tail -f storage/logs/laravel.log
```

Look for:
- "ForceCors: OPTIONS request handled"
- "Route OPTIONS handler"
- Any errors

### 4. Test with curl

```bash
curl -X OPTIONS http://localhost:8000/api/v1/admin/landlords \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -v
```

This shows:
- Status code
- All headers
- Any errors

## Common Issues

### Issue 1: Route Not Matching
- OPTIONS route might not be matching `/api/v1/admin/landlords`
- Check route order - OPTIONS route must be FIRST

### Issue 2: Middleware Not Running
- ForceCors might not be registered
- Check `bootstrap/app.php` for `ForceCors::class`

### Issue 3: Headers Not Being Set
- PHP `header()` might be blocked
- Laravel response headers might not be working
- Check if headers are actually in response

### Issue 4: Browser Cache
- Browser might be caching failed requests
- Try hard refresh (Ctrl+Shift+R)
- Try incognito mode

## Next Steps

1. Run `php test-options-direct.php` to see server-side behavior
2. Check browser Network tab for actual request/response
3. Check Laravel logs for errors
4. Test with curl to verify server is responding

This will help us identify where exactly the problem is!

