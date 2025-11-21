# Quick Start Guide - Starting Both Servers

## Option 1: Using PowerShell Script (Recommended)

1. Open PowerShell in the project root
2. Run:
```powershell
.\start-servers.ps1
```

## Option 2: Using Batch File

1. Double-click `start-servers.bat`
2. Or run from command prompt:
```cmd
start-servers.bat
```

## Option 3: Manual Start

### Backend (Laravel)
Laragon automatically starts the backend when you click "Start All". The backend runs at:
- **URL**: http://localhost:8000
- **API**: http://localhost:8000/api/v1

### Frontend (Next.js)
Open a terminal and run:
```bash
cd frontend
npm run dev
```
- **URL**: http://localhost:3000

## Verify Servers Are Running

### Backend Check:
```bash
curl http://localhost:8000/api/v1/health
```
Or visit: http://localhost:8000

### Frontend Check:
Visit: http://localhost:3000

## Laragon Commands

### Start All Services:
- Click "Start All" button in Laragon
- Or use Laragon menu: Services → Start All

### Stop All Services:
- Click "Stop All" button in Laragon
- Or use Laragon menu: Services → Stop All

### Restart Services:
- Click "Stop All" then "Start All"
- Or use Laragon menu: Services → Restart All

## Troubleshooting

### Backend not starting:
1. Check Laragon is running
2. Check port 8000 is not in use
3. Check PHP is installed in Laragon

### Frontend not starting:
1. Check Node.js is installed: `node --version`
2. Check dependencies: `cd frontend && npm install`
3. Check port 3000 is not in use

### Port conflicts:
- Backend (8000): Change in `backend/.env` → `APP_PORT=8000`
- Frontend (3000): Change in `frontend/package.json` or use `npm run dev -- -p 3001`

