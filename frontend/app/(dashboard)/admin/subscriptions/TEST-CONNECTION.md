# Quick Connection Test

## Test in Browser Console

Open your browser console (F12) on the `/admin/subscriptions` page and run:

```javascript
// Test 1: Check API URL
console.log('API URL:', 'http://localhost:8000/api/v1');

// Test 2: Check if you have a token
const token = localStorage.getItem("auth_token");
console.log('Has token:', !!token);
console.log('Token (first 20 chars):', token ? token.substring(0, 20) + '...' : 'NONE');

// Test 3: Test backend connection
fetch('http://localhost:8000/api/v1')
  .then(r => r.json())
  .then(data => console.log('✅ Backend reachable:', data))
  .catch(e => console.error('❌ Backend not reachable:', e));

// Test 4: Test authentication
if (token) {
  fetch('http://localhost:8000/api/v1/account', {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  .then(r => r.json())
  .then(data => {
    console.log('✅ Authenticated:', data);
    console.log('User role:', data?.user?.role);
    console.log('Is super_admin:', data?.user?.role === 'super_admin');
  })
  .catch(e => console.error('❌ Auth failed:', e));
}

// Test 5: Test admin endpoint
if (token) {
  fetch('http://localhost:8000/api/v1/admin/landlords', {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  .then(r => {
    console.log('Response status:', r.status);
    return r.json();
  })
  .then(data => {
    if (data.data) {
      console.log('✅ Admin endpoint works! Found', data.data.length, 'landlords');
    } else {
      console.log('Response:', data);
    }
  })
  .catch(e => {
    console.error('❌ Admin endpoint failed:', e);
    console.error('This usually means:');
    console.error('1. Backend not running');
    console.error('2. CORS blocking request');
    console.error('3. Not authenticated as super_admin');
  });
}
```

## Expected Results

✅ **All tests pass**: Admin panel should work
❌ **Test 3 fails**: Backend not running - start with `php artisan serve`
❌ **Test 4 fails**: Not logged in - log in again
❌ **Test 4 shows wrong role**: Not super_admin - create super_admin user
❌ **Test 5 fails with CORS error**: CORS not configured - check `backend/config/cors.php`
❌ **Test 5 fails with 403**: Not super_admin - check user role

