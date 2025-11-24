# How to Run the CORS Test

## Option 1: Using Laragon Terminal (Easiest)

1. Open **Laragon Terminal** (Ctrl+Alt+T in Laragon)
2. Navigate to backend:
   ```bash
   cd D:\Sandbox\Rent_V2\backend
   ```
3. Run the test:
   ```bash
   php test-cors-now.php
   ```

## Option 2: Using Batch File

1. Double-click `backend/TEST-CORS-SIMPLE.bat`
2. It will try to find PHP automatically
3. If it can't find PHP, it will show an error

## Option 3: Manual PHP Path

If PHP is not in PATH, find your PHP executable and run:

```bash
C:\laragon\bin\php\php-8.x.x\php.exe test-cors-now.php
```

(Replace `8.x.x` with your PHP version)

## What the Test Shows

The test will display:
1. ✅ CORS configuration (paths, origins, methods)
2. ✅ Test OPTIONS request to `/api/v1/admin/landlords`
3. ✅ Test OPTIONS request to `/api/v1/cors-options-test`
4. ✅ Whether CORS headers are present in responses

## Expected Output

If CORS is working, you should see:
```
✅ CORS headers are present!
   Access-Control-Allow-Origin: http://localhost:3000
   Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
```

If CORS is NOT working, you'll see:
```
❌ NO CORS HEADERS FOUND!
```

## After Running the Test

Share the output with me so I can see:
- Is the config loaded correctly?
- Are CORS headers being set?
- Which endpoint is working/not working?

