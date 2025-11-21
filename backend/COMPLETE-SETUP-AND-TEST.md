# Complete Backend Server Setup and Testing Guide

## ✅ What Has Been Done

### 1. Codebase Review
- ✅ Reviewed all API routes in `routes/api.php`
- ✅ Verified route structure and syntax
- ✅ Checked nginx configuration
- ✅ Reviewed Laravel bootstrap configuration

### 2. Server Cleanup
- ✅ Created cleanup script: `clean-and-fix-server.ps1`
- ✅ All cache clearing commands prepared
- ✅ Route syntax verified

### 3. Test Suite Created
- ✅ Created comprehensive test script: `test-all-endpoints.php`
- ✅ Tests all main API endpoints
- ✅ Provides detailed results

## 🚀 How to Run Everything

### Step 1: Clean and Fix Server
Run this in PowerShell from the `backend` directory:

```powershell
# Stop all PHP processes
Get-Process -Name "php" -ErrorAction SilentlyContinue | Stop-Process -Force

# Clear all caches
C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe artisan route:clear
C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe artisan config:clear
C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe artisan cache:clear
C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe artisan optimize:clear

# Delete cache files
Remove-Item -Path "bootstrap\cache\*.php" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "storage\framework\cache\*" -Recurse -Force -ErrorAction SilentlyContinue
```

### Step 2: Start the Server
In a terminal/command prompt, navigate to the `backend` directory and run:

```bash
php artisan serve
```

Or if using full path:
```bash
C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe artisan serve
```

The server should start on `http://localhost:8000`

### Step 3: Run API Tests
In another terminal, from the `backend` directory, run:

```bash
php test-all-endpoints.php
```

Or:
```bash
C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe test-all-endpoints.php
```

## 📋 API Endpoints Being Tested

1. **Health Check** - `GET /health`
2. **API v1 Root** - `GET /api/v1/`
3. **Currency Test Route** - `GET /api/v1/currencies-test`
4. **Simple Test Route** - `GET /api/v1/test-simple`
5. **Currencies** - `GET /api/v1/currencies` (Auth Required)
6. **Payment Methods** - `GET /api/v1/payment-methods` (Auth Required)
7. **Properties** - `GET /api/v1/properties` (Auth Required)
8. **Units** - `GET /api/v1/units` (Auth Required)
9. **Tenants** - `GET /api/v1/tenants` (Auth Required)
10. **Login** - `POST /api/v1/auth/login`

## 🔍 Expected Results

- **Public endpoints** (health, root, test routes): Should return 200
- **Protected endpoints**: Should return 401 (Unauthorized) - this is expected
- **Login endpoint**: May return 422 (Validation Error) without valid credentials - this is expected

## 📝 Notes

- The server must be manually started in a terminal window
- Keep the server running while running tests
- Some endpoints require authentication tokens
- The test script will show detailed results for each endpoint

## 🛠️ Troubleshooting

If server won't start:
1. Check if port 8000 is already in use: `netstat -ano | findstr ":8000"`
2. Kill any existing PHP processes: `Get-Process -Name "php" | Stop-Process -Force`
3. Try a different port: `php artisan serve --port=8001`

If routes return 404:
1. Make sure server was restarted after route changes
2. Clear route cache: `php artisan route:clear`
3. Verify routes file syntax: `php -l routes/api.php`

## ✅ Verification

After running tests, you should see:
- ✅ Health Check Endpoint - Status: 200
- ✅ API v1 Root Endpoint - Status: 200
- ✅ Currency Test Route - Status: 200
- ✅ Simple Test Route - Status: 200
- ⚠️ Protected endpoints - Status: 401 (Expected)
- ⚠️ Login endpoint - Status: 422 or 401 (Expected)

