# How to Start Backend Server

## Quick Start

### Option 1: Using Batch File
```bash
cd backend
start-server.bat
```

### Option 2: Manual
```bash
cd backend
php artisan serve
```

### Option 3: With Specific Host/Port
```bash
cd backend
php artisan serve --host=127.0.0.1 --port=8000
```

## Verify Backend is Running

After starting, you should see:
```
INFO  Server running on [http://127.0.0.1:8000]
```

Then test in browser:
- Open: `http://localhost:8000/api/v1`
- Should see: `{"status":"ok","message":"RentApplicaiton API v1 online"}`

## If PHP Not Found

If you get "php is not recognized":
1. Make sure PHP is installed
2. Add PHP to your PATH, OR
3. Use full path to PHP (e.g., `C:\laragon\bin\php\php-8.x\php.exe artisan serve`)

## Troubleshooting

### Port 8000 Already in Use
```bash
# Use different port
php artisan serve --port=8001
```

### Permission Denied
- Make sure you're in the backend directory
- Check file permissions

### Still Not Working?
1. Check if another process is using port 8000
2. Try a different port
3. Check Laravel logs: `storage/logs/laravel.log`

