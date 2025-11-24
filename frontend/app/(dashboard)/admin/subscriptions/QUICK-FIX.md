# Quick Fix for "Unable to connect to the server"

## Step 1: Restart Backend (REQUIRED after CORS fix)

The CORS middleware was just fixed. You **MUST** restart the backend for changes to take effect:

1. **Stop the backend:**
   - Find the terminal running `php artisan serve`
   - Press `Ctrl+C` to stop it

2. **Start it again:**
   ```bash
   cd D:\Sandbox\Rent_V2\backend
   php artisan serve
   ```

3. **Wait for:** `INFO  Server running on [http://127.0.0.1:8000]`

## Step 2: Check Your User Role

Open browser console (F12) and run:

```javascript
const token = localStorage.getItem('auth_token');
fetch('http://localhost:8000/api/v1/account', {
  headers: { 'Authorization': 'Bearer ' + token }
})
.then(r => r.json())
.then(data => {
  console.log('Your role:', data?.user?.role);
  if (data?.user?.role !== 'super_admin') {
    console.error('❌ You are NOT a super_admin!');
    console.log('Current role:', data?.user?.role);
    console.log('\nTo create a super_admin user, run in backend terminal:');
    console.log('php artisan user:create "Super" "Admin" "admin@example.com" "Password123!" --role=super_admin');
  } else {
    console.log('✅ You are a super_admin!');
  }
});
```

## Step 3: Test Admin Endpoint Directly

```javascript
const token = localStorage.getItem('auth_token');
fetch('http://localhost:8000/api/v1/admin/landlords', {
  headers: {
    'Accept': 'application/json',
    'Authorization': 'Bearer ' + token
  }
})
.then(r => {
  console.log('Status:', r.status);
  return r.json();
})
.then(data => {
  if (data.data) {
    console.log('✅ SUCCESS! Found', data.data.length, 'landlords');
  } else {
    console.log('Response:', data);
  }
})
.catch(e => {
  console.error('❌ Error:', e);
  if (e.message === 'Failed to fetch') {
    console.error('This means backend is not reachable or CORS is blocking.');
    console.error('Make sure you restarted the backend after the CORS fix!');
  }
});
```

## Common Issues

### "Failed to fetch" after restarting
- **Check:** Open `http://localhost:8000/api/v1` in browser
- **If it works:** CORS issue - check browser Network tab for CORS errors
- **If it doesn't work:** Backend not running properly

### Status 403 Forbidden
- **Fix:** You're not a super_admin - create one (see Step 2)

### Status 401 Unauthorized  
- **Fix:** Log out and log back in

### Still getting "Failed to fetch"
- **Check browser Network tab (F12 → Network):**
  - Look for the request to `/admin/landlords`
  - Check if it shows CORS error (red, blocked)
  - Check the response headers

## Most Likely Issue

**You haven't restarted the backend yet!** The CORS fix requires a restart.

After restarting, refresh the admin page and it should work.

