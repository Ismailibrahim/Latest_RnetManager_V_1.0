# How to Start Backend Server in Laragon Terminal

## Option 1: Using Batch File (Easiest)

1. Double-click `start-backend-laragon.bat` in the project root
2. The server will start on `http://localhost:8000`

## Option 2: Manual Commands in Laragon Terminal

Open Laragon terminal and run:

```bash
cd C:\laragon\www\Rent_V2\backend
php artisan serve --host=0.0.0.0 --port=8000
```

Or if you're already in the project directory:

```bash
cd backend
php artisan serve --host=0.0.0.0 --port=8000
```

## Option 3: Using PowerShell Script

1. Open PowerShell in the project root
2. Run: `.\start-backend-laragon.ps1`

## Verify Server is Running

Open in browser: `http://localhost:8000/api/v1/health`

You should see a JSON response like:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "database": "connected"
}
```

## Notes

- The `--host=0.0.0.0` allows access from other devices on your network
- The `--port=8000` specifies the port (Laragon default)
- Press `Ctrl+C` to stop the server

