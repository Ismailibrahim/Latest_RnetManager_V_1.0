# Quick Debug Steps

## Step 1: Open Browser Console
Press F12, go to Console tab

## Step 2: Run This Test Script

Copy and paste this entire block into the console:

```javascript
(async function() {
  console.log('=== ADMIN PANEL CONNECTION TEST ===\n');
  
  // Test 1: Check API URL
  const API_BASE_URL = 'http://localhost:8000/api/v1';
  console.log('1. API URL:', API_BASE_URL);
  
  // Test 2: Check token
  const token = localStorage.getItem('auth_token');
  if (!token) {
    console.error('❌ No token found. Please log in.');
    return;
  }
  console.log('✅ Token found:', token.substring(0, 20) + '...');
  
  // Test 3: Backend reachable
  console.log('\n2. Testing backend connection...');
  try {
    const health = await fetch('http://localhost:8000/api/v1');
    console.log('✅ Backend reachable, status:', health.status);
    const healthData = await health.json().catch(() => ({}));
    console.log('   Response:', healthData);
  } catch (err) {
    console.error('❌ Backend NOT reachable:', err.message);
    console.error('   → Start backend: cd backend && php artisan serve');
    return;
  }
  
  // Test 4: Check user role
  console.log('\n3. Checking user role...');
  try {
    const account = await fetch('http://localhost:8000/api/v1/account', {
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    });
    
    if (account.ok) {
      const accountData = await account.json();
      const role = accountData?.user?.role;
      console.log('   Your role:', role);
      
      if (role === 'super_admin') {
        console.log('✅ You are a super_admin!');
      } else {
        console.error('❌ You are NOT a super_admin. Current role:', role);
        console.error('   → Create super_admin: php artisan user:create "Super" "Admin" "admin@example.com" "Password123!" --role=super_admin');
        return;
      }
    } else {
      const error = await account.json().catch(() => ({}));
      console.error('❌ Auth failed:', account.status, error);
      return;
    }
  } catch (err) {
    console.error('❌ Failed to check role:', err.message);
    return;
  }
  
  // Test 5: Test admin endpoint
  console.log('\n4. Testing admin endpoint...');
  try {
    const admin = await fetch('http://localhost:8000/api/v1/admin/landlords', {
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    });
    
    console.log('   Status:', admin.status);
    
    if (admin.ok) {
      const data = await admin.json();
      console.log('✅ Admin endpoint works!');
      console.log('   Found', data?.data?.length || 0, 'landlords');
    } else if (admin.status === 403) {
      console.error('❌ Access denied (403). You must be super_admin.');
    } else if (admin.status === 401) {
      console.error('❌ Unauthorized (401). Please log in again.');
    } else {
      const error = await admin.json().catch(() => ({}));
      console.error('❌ Error:', admin.status, error);
    }
  } catch (err) {
    console.error('❌ Network error:', err.message);
    if (err.message === 'Failed to fetch') {
      console.error('   This usually means:');
      console.error('   1. Backend server is not running');
      console.error('   2. CORS is blocking the request');
      console.error('   3. Check browser Network tab for details');
    }
  }
  
  console.log('\n=== TEST COMPLETE ===');
})();
```

## Step 3: Check Results

The script will tell you exactly what's wrong:
- ✅ All green = Everything works!
- ❌ Red = See the error message for what to fix

## Common Issues & Fixes

### "Backend NOT reachable"
**Fix:** Start the backend server
```bash
cd D:\Sandbox\Rent_V2\backend
php artisan serve
```

### "You are NOT a super_admin"
**Fix:** Create a super_admin user
```bash
cd D:\Sandbox\Rent_V2\backend
php artisan user:create "Super" "Admin" "admin@example.com" "Password123!" --role=super_admin
```
Then log out and log back in with that account.

### "Network error: Failed to fetch"
**Fix:** Check CORS configuration
1. Open `backend/config/cors.php`
2. Ensure it allows `http://localhost:3000`
3. Restart backend server

### "Access denied (403)"
**Fix:** You're not a super_admin - see above

