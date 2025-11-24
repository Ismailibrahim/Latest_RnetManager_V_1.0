# Using Laravel's Built-in CORS

## The Problem
"Failed to fetch" means the browser is blocking the request before it reaches the server. This happens when the OPTIONS preflight fails.

## Solution: Use Laravel's Built-in CORS

Laravel 11 has built-in CORS support via `HandleCors` middleware. Instead of fighting with custom middleware, let's use Laravel's built-in one properly.

## Configuration

The CORS config is in `backend/config/cors.php`:

- ✅ `paths`: `['api/*', 'sanctum/csrf-cookie']` - Routes that need CORS
- ✅ `allowed_origins`: `['http://localhost:3000', 'http://127.0.0.1:3000']`
- ✅ `allowed_origins_patterns`: Regex patterns for localhost ports
- ✅ `allowed_methods`: `['*']` - All methods
- ✅ `allowed_headers`: `['*']` - All headers
- ✅ `supports_credentials`: `true`
- ✅ `max_age`: `86400` - Cache preflight for 24 hours

## Next Steps

1. **Clear caches:**
   ```bash
   cd backend
   php artisan config:clear
   php artisan cache:clear
   php artisan route:clear
   ```

2. **Restart backend server:**
   - Stop (Ctrl+C)
   - Start: `php artisan serve`

3. **Test again:**
   - Open: `http://localhost:3000/test-cors-simple.html`
   - Or test in browser console

## How Laravel's HandleCors Works

Laravel automatically applies `HandleCors` middleware to routes matching `paths` in `config/cors.php`. It:
- Handles OPTIONS preflight requests automatically
- Sets CORS headers based on config
- Works with the `allowed_origins_patterns` for dynamic ports

## If Still Not Working

1. Check `.env` file - make sure `APP_ENV=local`
2. Verify `config/cors.php` is being loaded (check `bootstrap/cache/config.php` is cleared)
3. Check Laravel logs for CORS-related errors
4. Try accessing a simple endpoint first: `http://localhost:8000/api/v1/cors-test`

