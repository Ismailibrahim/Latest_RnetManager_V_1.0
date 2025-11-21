# How to Start the Application

## Quick Start

### Option 1: Use the Batch File (Easiest)
Double-click `START-SERVERS.bat` in the project root. It will start both servers automatically.

### Option 2: Manual Start (Step by Step)

#### Start Backend Server (Laravel)
1. Open **Laragon Terminal** (press `Ctrl+Alt+T` in Laragon or click Terminal button)
2. Run these commands:
   ```powershell
   cd C:\laragon\www\Rent_V2_Backend
   php artisan serve
   ```
3. You should see:
   ```
   INFO  Server running on [http://127.0.0.1:8000].
   Press Ctrl+C to stop the server
   ```
4. **Keep this terminal window open** - don't close it!

#### Start Frontend Server (Next.js)
1. Open a **new** terminal window (PowerShell or Command Prompt)
2. Navigate to the frontend:
   ```powershell
   cd D:\Sandbox\Rent_V2\frontend
   ```
3. Start the dev server:
   ```powershell
   npm run dev
   ```
4. You should see:
   ```
   ▲ Next.js 16.0.1
   - Local:        http://localhost:3000
   ```
5. **Keep this terminal window open** too!

## Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/v1

## Troubleshooting

### Backend won't start
- Make sure Laragon services are running (MySQL should be green)
- Check if port 8000 is already in use:
  ```powershell
  netstat -ano | findstr :8000
  ```

### Frontend can't connect to backend
1. Make sure backend is running (check http://localhost:8000/api/v1/health)
2. Check CORS configuration in `C:\laragon\www\Rent_V2_Backend\.env`:
   ```
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   ```
3. Restart the backend server after changing CORS settings

### Port already in use
If port 8000 is taken, use a different port:
```powershell
php artisan serve --port=8001
```
Then update `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1
```

## Important Notes

- **Both servers must be running** for the app to work
- Keep both terminal windows open while using the app
- Stop servers by pressing `Ctrl+C` in their respective terminal windows
- Backend runs on port 8000, frontend on port 3000

