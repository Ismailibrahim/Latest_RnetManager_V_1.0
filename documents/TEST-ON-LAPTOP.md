# Testing Your App on Your Laptop

## Quick Access URLs

### For Local Development (Recommended while coding)

**Frontend (Next.js):**
```
http://localhost:3000
```

**Backend API:**
```
http://localhost:8000/api/v1
```

**Login Page:**
```
http://localhost:3000/login
```

### For Network Access (Mobile/Other devices)

**Frontend:**
```
http://192.168.1.225:3000
```

**Backend API:**
```
http://192.168.1.225:8000/api/v1
```

## Configuration for Local Testing

### Option 1: Use Localhost (Easiest)

When testing on your laptop, you can use `localhost` instead of the network IP. The frontend is already configured to work with both.

**Current Configuration:**
- Frontend API URL: `http://192.168.1.225:8000/api/v1` (for mobile)
- Backend CORS: Includes both `localhost:3000` and `192.168.1.225:3000`

**For local testing, you can:**
1. Just use `http://localhost:3000` in your browser
2. The backend at `http://localhost:8000` should work
3. CORS is already configured to allow `localhost:3000`

### Option 2: Keep Network IP (Current Setup)

If you want to keep the current setup (network IP), you can:
1. Use `http://192.168.1.225:3000` on your laptop
2. Everything will work the same as on mobile

## Quick Test Commands

### Check if servers are running:

```bash
# Check frontend
netstat -ano | findstr ":3000" | findstr LISTENING

# Check backend
netstat -ano | findstr ":8000" | findstr LISTENING
```

### Start servers for local testing:

**Backend:**
```bash
cd C:\laragon\www\Rent_V2_Backend
php artisan serve --host=0.0.0.0 --port=8000
```

**Frontend:**
```bash
cd D:\Sandbox\Rent_V2\frontend
npm run dev
```

Then open: `http://localhost:3000`

## Recommended Setup for Development

1. **Use localhost for laptop testing** - Faster, simpler
2. **Use network IP for mobile testing** - When you need to test on phone
3. **Both work simultaneously** - You can test on both at the same time!

## Switching Between Local and Network

You don't need to change anything! The current setup supports both:
- ✅ `localhost:3000` works (for laptop)
- ✅ `192.168.1.225:3000` works (for mobile)

The backend CORS is configured to allow both origins.

## Troubleshooting

### If localhost doesn't work:

1. **Check backend is running:**
   ```bash
   netstat -ano | findstr ":8000"
   ```

2. **Check frontend is running:**
   ```bash
   netstat -ano | findstr ":3000"
   ```

3. **Verify CORS includes localhost:**
   - Check `C:\laragon\www\Rent_V2_Backend\.env`
   - Should have: `CORS_ALLOWED_ORIGINS=http://localhost:3000,...`

4. **Clear browser cache** if you see old errors

## Best Practice

**While coding:**
- Use `http://localhost:3000` on your laptop
- Fast, simple, no network issues

**When testing on mobile:**
- Use `http://192.168.1.225:3000` on your phone
- Same servers, just different URL

Both work at the same time! 🎉

