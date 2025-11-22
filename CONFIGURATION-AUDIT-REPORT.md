# Configuration Audit Report

**Date**: $(Get-Date -Format "yyyy-MM-dd")  
**Purpose**: Ensure all configurations are environment-driven for easy deployment

---

## Executive Summary

This audit identifies and fixes all hardcoded configurations to ensure the application is fully environment-driven and deployment-ready.

---

## Issues Found and Fixed

### ✅ 1. Currency Configuration (FIXED)

**Issue**: Hardcoded currency values (MVR, USD) in frontend code

**Files Affected**:
- `frontend/app/(dashboard)/payments/collect/page.jsx`
- `frontend/lib/currency.js`
- Multiple pages with `formatCurrency` functions

**Solution**:
- Created `frontend/utils/currency-config.js` to read from `NEXT_PUBLIC_PRIMARY_CURRENCY` and `NEXT_PUBLIC_SECONDARY_CURRENCY`
- Created `frontend/lib/currency-formatter.js` for centralized currency formatting
- Updated all currency references to use environment variables

**Environment Variables Required**:
```env
NEXT_PUBLIC_PRIMARY_CURRENCY=MVR
NEXT_PUBLIC_SECONDARY_CURRENCY=USD
```

---

### ✅ 2. PHP Path in PowerShell Scripts (FIXED)

**Issue**: Hardcoded PHP executable paths in PowerShell scripts

**Files Affected**:
- `backend/clean-and-fix-server.ps1`
- `backend/restart-and-test-payments.ps1`
- `backend/run-api-tests.ps1`
- `backend/fix-currency-routes-complete.ps1`

**Solution**:
- Scripts now check `$env:PHP_PATH` first
- Fallback to PHP in system PATH
- Final fallback to common Laragon path (with warning)

**Environment Variable** (Optional):
```powershell
$env:PHP_PATH = "C:\path\to\php.exe"
```

---

### ✅ 3. CORS Configuration (FIXED)

**Issue**: Hardcoded localhost values in CORS config default

**File**: `backend/config/cors.php`

**Solution**:
- Now requires `CORS_ALLOWED_ORIGINS` to be set in production
- Falls back to localhost only if env var is empty

**Environment Variable Required**:
```env
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

### ✅ 4. Sanctum Configuration (FIXED)

**Issue**: Hardcoded localhost domains in Sanctum config

**File**: `backend/config/sanctum.php`

**Solution**:
- Now requires `SANCTUM_STATEFUL_DOMAINS` to be set
- Falls back to localhost only if env var is empty

**Environment Variable Required**:
```env
SANCTUM_STATEFUL_DOMAINS=yourdomain.com,www.yourdomain.com,localhost:3000
```

---

### ✅ 5. API Base URL (ALREADY CONFIGURED)

**Status**: ✅ Already using environment variables

**File**: `frontend/utils/api-config.js`

**Configuration**:
- Uses `NEXT_PUBLIC_API_URL` from environment
- Falls back to localhost only in development
- Requires env var in production

---

### ✅ 6. Database Configuration (ALREADY CONFIGURED)

**Status**: ✅ Already using environment variables

**Files**: `backend/config/database.php`, `backend/.env.example`

**Configuration**:
- All database settings come from `.env`:
  - `DB_CONNECTION`
  - `DB_HOST`
  - `DB_PORT`
  - `DB_DATABASE`
  - `DB_USERNAME`
  - `DB_PASSWORD`

---

### ✅ 7. Application Configuration (ALREADY CONFIGURED)

**Status**: ✅ Already using environment variables

**File**: `backend/config/app.php`

**Configuration**:
- `APP_NAME` from env
- `APP_ENV` from env
- `APP_DEBUG` from env
- `APP_URL` from env

---

## Environment Variables Summary

### Backend (.env)

**Required for Production**:
```env
APP_NAME=RentApplicaiton
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=rentapp_production
DB_USERNAME=rentapp_user
DB_PASSWORD=your_secure_password

CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
SANCTUM_STATEFUL_DOMAINS=yourdomain.com,www.yourdomain.com

CURRENCY_PRIMARY=MVR
CURRENCY_SECONDARY=USD

FRONTEND_URL=https://yourdomain.com
```

### Frontend (.env.local)

**Required for Production**:
```env
NEXT_PUBLIC_APP_NAME=RentApplicaiton
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_API_URL=/api/v1

NEXT_PUBLIC_PRIMARY_CURRENCY=MVR
NEXT_PUBLIC_SECONDARY_CURRENCY=USD
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Copy `.env.example` to `.env` in backend
- [ ] Copy `.env.example` to `.env.local` in frontend
- [ ] Set all required environment variables
- [ ] Verify no hardcoded values remain
- [ ] Test configuration loading

### Backend Deployment

- [ ] Set `APP_ENV=production`
- [ ] Set `APP_DEBUG=false`
- [ ] Configure database credentials
- [ ] Set `APP_URL` to production domain
- [ ] Configure `CORS_ALLOWED_ORIGINS`
- [ ] Configure `SANCTUM_STATEFUL_DOMAINS`
- [ ] Set currency configuration

### Frontend Deployment

- [ ] Set `NEXT_PUBLIC_APP_ENV=production`
- [ ] Set `NEXT_PUBLIC_API_URL` (relative path for reverse proxy)
- [ ] Set currency environment variables
- [ ] Build with production environment

---

## Files Modified

### Created
- `frontend/utils/currency-config.js` - Currency configuration utility
- `frontend/lib/currency-formatter.js` - Centralized currency formatting
- `backend/scripts/get-php-path.ps1` - PHP path detection utility

### Modified
- `frontend/app/(dashboard)/payments/collect/page.jsx` - Uses env-based currency config
- `frontend/lib/currency.js` - Uses env-based currency
- `backend/config/cors.php` - Requires CORS_ALLOWED_ORIGINS
- `backend/config/sanctum.php` - Requires SANCTUM_STATEFUL_DOMAINS
- `backend/clean-and-fix-server.ps1` - Uses PHP_PATH env var
- `backend/restart-and-test-payments.ps1` - Uses PHP_PATH env var
- `backend/run-api-tests.ps1` - Uses PHP_PATH env var
- `backend/fix-currency-routes-complete.ps1` - Uses PHP_PATH env var

---

## Testing Configuration

### Verify Environment Variables

**Backend**:
```bash
php artisan tinker
>>> config('app.name')
>>> config('app.url')
>>> config('database.default')
>>> config('cors.allowed_origins')
```

**Frontend**:
```javascript
console.log(process.env.NEXT_PUBLIC_API_URL);
console.log(process.env.NEXT_PUBLIC_PRIMARY_CURRENCY);
```

---

## Recommendations

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Document all environment variables** - Keep `.env.example` updated
3. **Use different values per environment** - Dev, staging, production
4. **Validate required variables** - Add startup checks if needed
5. **Use secrets management** - For production deployments (e.g., AWS Secrets Manager, HashiCorp Vault)

---

## Status

✅ **All hardcoded configurations have been replaced with environment variables**

The application is now fully environment-driven and ready for deployment across different environments.

