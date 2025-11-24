# Quick CORS Test

## Step 1: Start Backend
```bash
cd backend
php artisan serve
```

## Step 2: Open Browser Console (F12)

## Step 3: Run This Test

```javascript
// Test OPTIONS preflight
fetch('http://localhost:8000/api/v1/admin/landlords', {
  method: 'OPTIONS',
  mode: 'cors',
  headers: {
    'Origin': 'http://localhost:3000',
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'Authorization'
  }
}).then(r => {
  console.log('✅ OPTIONS Status:', r.status);
  console.log('✅ CORS Origin:', r.headers.get('Access-Control-Allow-Origin'));
  console.log('✅ CORS Methods:', r.headers.get('Access-Control-Allow-Methods'));
  console.log('✅ CORS Headers:', r.headers.get('Access-Control-Allow-Headers'));
  console.log('✅ CORS Credentials:', r.headers.get('Access-Control-Allow-Credentials'));
}).catch(e => {
  console.error('❌ OPTIONS Error:', e);
  console.error('Backend might not be running!');
});
```

## Expected Output

```
✅ OPTIONS Status: 204
✅ CORS Origin: http://localhost:3000
✅ CORS Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
✅ CORS Headers: Content-Type, Authorization, X-Requested-With, Accept
✅ CORS Credentials: true
```

## If You See Errors

- **"Failed to fetch"** → Backend not running
- **Status 404** → Route not found (check backend is running)
- **Status 500** → PHP error (check `storage/logs/laravel.log`)
- **CORS headers missing** → Entry-point handler not working

## Test Page

I've also created a test page at:
**http://localhost:3000/test-cors-direct.html**

Open it and click the test buttons to see results.

