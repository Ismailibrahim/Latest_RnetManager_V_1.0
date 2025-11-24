# Starting the Backend Server

## ⚠️ Important: Use Process Manager (Recommended)

**The backend now includes automatic crash recovery!** Use the process manager scripts to ensure the server automatically restarts if it crashes.

### Option 1: Process Manager (Recommended - Auto-Restart on Crash)

This is the **recommended** way to start the server as it automatically restarts if the server crashes.

1. Open **PowerShell** (as Administrator if needed)
2. Navigate to backend directory:
   ```powershell
   cd D:\Sandbox\RentApplicaiton\backend
   ```
3. Start the server with process manager:
   ```powershell
   .\start-server.ps1
   ```
   Or with a custom port:
   ```powershell
   .\start-server.ps1 8001
   ```

**Features:**
- ✅ Automatically restarts on crash (up to 10 times)
- ✅ Logs all errors to `storage/logs/artisan-serve-error.log`
- ✅ Graceful shutdown with Ctrl+C
- ✅ Shows restart attempts and error details

### Option 2: Queue Worker with Process Manager

If you need queue workers, use the queue process manager:

```powershell
.\start-queue.ps1
```

This will automatically restart the queue worker if it crashes.

### Option 3: Manual Start (Not Recommended)

If you prefer to start manually without auto-restart:

1. Open **Laragon Terminal** (or PowerShell)
2. Navigate to backend directory:
   ```powershell
   cd D:\Sandbox\RentApplicaiton\backend
   ```
3. Start the server:
   ```powershell
   php artisan serve
   ```
4. The server will start at `http://127.0.0.1:8000`

**Note:** The server may crash on fatal errors without the process manager. Use Option 1 for production-like reliability.

## Verify Server is Running

Once started, you should see:
```
INFO  Server running on [http://127.0.0.1:8000]
```

Test the API:
- Open browser: `http://localhost:8000/api/v1`
- Should see: `{"status":"ok","message":"RentApplicaiton API v1 online"}`

## Troubleshooting

### Server Keeps Crashing

If the server keeps crashing and restarting:

1. **Check the error logs:**
   ```powershell
   # View server errors
   Get-Content backend\storage\logs\artisan-serve-error.log -Tail 50
   
   # View Laravel errors
   Get-Content backend\storage\logs\laravel.log -Tail 50
   ```

2. **Common causes:**
   - Database connection issues (check MySQL is running)
   - Missing database tables (run `php artisan migrate`)
   - Memory exhaustion (check PHP memory limit in `php.ini`)
   - Syntax errors in code

3. **Check database connection:**
   ```powershell
   php artisan tinker
   # Then try: DB::connection()->getPdo();
   ```

### Port 8000 Already in Use

If you get "Port 8000 is already in use":
```powershell
.\start-server.ps1 8001
```
Then update frontend `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1
```

### Database Connection Error

Make sure:
1. MySQL is running in Laragon
2. Database exists (check `backend/.env` for `DB_DATABASE`)
3. Run migrations if needed:
   ```powershell
   php artisan migrate
   ```

### CORS Issues

If you get CORS errors, check `backend/config/cors.php` and ensure `FRONTEND_URL` in `.env` matches your frontend URL.

### PowerShell Execution Policy Error

If you get "execution of scripts is disabled", run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Stopping the Server

Press `Ctrl + C` in the terminal where the server is running. The process manager will stop gracefully.

## What's New: Crash Recovery

The backend now includes:

- ✅ **Automatic crash recovery** - Server restarts automatically on fatal errors
- ✅ **Better error logging** - All errors are logged with full stack traces
- ✅ **Graceful error handling** - Database errors return proper JSON responses instead of crashing
- ✅ **Memory monitoring** - Memory exhaustion is detected and logged
- ✅ **Fatal error catching** - PHP fatal errors are caught and logged

These improvements prevent the server from stopping unexpectedly and provide better visibility into what's causing issues.

