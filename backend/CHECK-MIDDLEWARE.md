# Check if CORS Middleware is Running

## Step 1: Check Laravel Logs

After making an OPTIONS request, check the logs:

```bash
cd backend
tail -50 storage/logs/laravel.log | grep -i cors
```

You should see entries like:
- `CORS Middleware: RUNNING`
- `CORS Middleware: OPTIONS preflight handled`
- `CORS Middleware: Returning OPTIONS response`

**If you DON'T see these logs, the middleware is NOT running!**

## Step 2: Verify Middleware Registration

Check if middleware is registered:

```bash
cd backend
php artisan route:list --path=admin/landlords
```

## Step 3: Check Environment

Make sure `.env` has:
```
APP_ENV=local
```
or
```
APP_ENV=development
```

## Step 4: Clear All Caches

```bash
cd backend
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
```

## Step 5: Restart Backend

**CRITICAL:** Restart the backend server after clearing caches!

```bash
# Stop current server (Ctrl+C)
# Then:
php artisan serve
```

## If Middleware is NOT Running:

1. Check `bootstrap/app.php` - middleware should be prepended
2. Check for syntax errors in `CorsMiddleware.php`
3. Check Laravel version compatibility
4. Try removing and re-adding the middleware

## If Middleware IS Running but Headers Missing:

1. Laravel's HandleCors might be interfering
2. Check if another middleware is removing headers
3. Try using Laravel's built-in CORS config instead

