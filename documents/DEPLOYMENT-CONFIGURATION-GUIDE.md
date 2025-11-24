# Deployment Configuration Guide

**Purpose**: Ensure all configurations are environment-driven for easy deployment across different environments.

---

## ✅ Configuration Status

All hardcoded values have been replaced with environment variables. The application is now fully environment-driven.

---

## Environment Variables Required

### Backend (.env)

**Copy from**: `env/backend.env.example` to `backend/.env`

**Required Variables**:

```env
# Application
APP_NAME=RentApplicaiton
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=rentapp_production
DB_USERNAME=rentapp_user
DB_PASSWORD=your_secure_password

# Frontend
FRONTEND_URL=https://yourdomain.com

# CORS (Required for production)
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Sanctum (Required for production)
SANCTUM_STATEFUL_DOMAINS=yourdomain.com,www.yourdomain.com

# Currency
CURRENCY_PRIMARY=MVR
CURRENCY_SECONDARY=USD

# File Upload
TENANT_DOC_MAX_KB=20480
```

**Optional Variables** (for development/testing):
```env
API_BASE_URL=http://localhost:8000
PHP_PATH=C:\path\to\php.exe
```

---

### Frontend (.env.local)

**Copy from**: `env/frontend.env.example` to `frontend/.env.local`

**Required Variables**:

```env
# Application
NEXT_PUBLIC_APP_NAME=RentApplicaiton
NEXT_PUBLIC_APP_ENV=production

# API (use relative path when behind reverse proxy)
NEXT_PUBLIC_API_URL=/api/v1

# Currency
NEXT_PUBLIC_PRIMARY_CURRENCY=MVR
NEXT_PUBLIC_SECONDARY_CURRENCY=USD
```

**For Development**:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## Configuration Files Updated

### ✅ Backend Configuration

1. **`backend/config/app.php`** - Uses `env()` for all settings
2. **`backend/config/database.php`** - Uses `env()` for database config
3. **`backend/config/cors.php`** - Uses `CORS_ALLOWED_ORIGINS` from env
4. **`backend/config/sanctum.php`** - Uses `SANCTUM_STATEFUL_DOMAINS` from env

### ✅ Frontend Configuration

1. **`frontend/utils/api-config.js`** - Uses `NEXT_PUBLIC_API_URL` from env
2. **`frontend/utils/currency-config.js`** - NEW: Reads currency from env
3. **`frontend/lib/currency-formatter.js`** - NEW: Centralized currency formatting

### ✅ Scripts Updated

1. **PowerShell Scripts** - Now use `$env:PHP_PATH` or auto-detect PHP
2. **Batch Scripts** - Now use `%PHP_PATH%` or auto-detect PHP
3. **Test Scripts** - Now use `API_BASE_URL` environment variable

---

## Currency Configuration

### How It Works

1. **Environment Variables**:
   - `NEXT_PUBLIC_PRIMARY_CURRENCY` (default: MVR)
   - `NEXT_PUBLIC_SECONDARY_CURRENCY` (default: USD)

2. **Usage in Code**:
   ```javascript
   import { getCurrencyOptions, getDefaultCurrency } from '@/utils/currency-config';
   
   const currencyOptions = getCurrencyOptions();
   const defaultCurrency = getDefaultCurrency();
   ```

3. **Currency Formatting**:
   ```javascript
   import { formatCurrency, formatCurrencyNoDecimals } from '@/lib/currency-formatter';
   
   formatCurrency(1000); // Uses primary currency from env
   formatCurrency(1000, 'USD'); // Specific currency
   ```

---

## Deployment Steps

### 1. Backend Setup

```bash
cd backend
cp env/backend.env.example .env
# Edit .env with your production values
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --force
php artisan config:cache
php artisan route:cache
```

### 2. Frontend Setup

```bash
cd frontend
cp env/frontend.env.example .env.local
# Edit .env.local with your production values
npm ci
npm run build
```

### 3. Verify Configuration

**Backend**:
```bash
php artisan tinker
>>> config('app.name')
>>> config('app.url')
>>> config('cors.allowed_origins')
```

**Frontend**:
```bash
# Check build output for environment variables
npm run build
```

---

## Configuration Validation

### Required Checks Before Deployment

- [ ] All `.env` files are created from `.env.example`
- [ ] No hardcoded URLs in code
- [ ] No hardcoded database credentials
- [ ] CORS origins are set for production domain
- [ ] Sanctum domains are set for production domain
- [ ] Currency values are set via environment variables
- [ ] API URLs are configured correctly
- [ ] Debug mode is disabled in production

---

## Environment-Specific Configurations

### Development
```env
APP_ENV=local
APP_DEBUG=true
CORS_ALLOWED_ORIGINS=http://localhost:3000
SANCTUM_STATEFUL_DOMAINS=localhost,localhost:3000
```

### Staging
```env
APP_ENV=staging
APP_DEBUG=false
CORS_ALLOWED_ORIGINS=https://staging.yourdomain.com
SANCTUM_STATEFUL_DOMAINS=staging.yourdomain.com
```

### Production
```env
APP_ENV=production
APP_DEBUG=false
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
SANCTUM_STATEFUL_DOMAINS=yourdomain.com,www.yourdomain.com
```

---

## Files Modified

### Created
- `frontend/utils/currency-config.js` - Currency configuration utility
- `frontend/lib/currency-formatter.js` - Centralized currency formatting
- `backend/scripts/get-php-path.ps1` - PHP path detection utility
- `CONFIGURATION-AUDIT-REPORT.md` - Configuration audit report
- `DEPLOYMENT-CONFIGURATION-GUIDE.md` - This file

### Modified
- `frontend/app/(dashboard)/payments/collect/page.jsx` - Uses env-based currency
- `frontend/lib/currency.js` - Uses env-based currency
- `frontend/app/(dashboard)/units/page.jsx` - Uses currency formatter
- `frontend/app/(dashboard)/tenant-units/new/page.jsx` - Uses currency formatter
- `backend/config/cors.php` - Requires CORS_ALLOWED_ORIGINS
- `backend/config/sanctum.php` - Requires SANCTUM_STATEFUL_DOMAINS
- `backend/clean-and-fix-server.ps1` - Uses PHP_PATH env var
- `backend/restart-and-test-payments.ps1` - Uses PHP_PATH env var
- `backend/run-api-tests.ps1` - Uses PHP_PATH and API_BASE_URL env vars
- `backend/fix-currency-routes-complete.ps1` - Uses PHP_PATH env var
- `backend/START-SERVER-AND-TEST.bat` - Uses PHP_PATH env var
- `backend/test-all-routes.php` - Uses API_BASE_URL env var
- `backend/test-payments-collect-apis.php` - Uses API_BASE_URL env var
- `backend/test-authentication.php` - Uses API_BASE_URL env var
- `backend/test-login-route.php` - Uses API_BASE_URL env var
- `env/backend.env.example` - Updated with all required variables
- `env/frontend.env.example` - Updated with all required variables

---

## Testing Configuration

### Verify Environment Variables Are Loaded

**Backend**:
```bash
php artisan tinker
>>> env('APP_NAME')
>>> env('CURRENCY_PRIMARY')
>>> config('cors.allowed_origins')
```

**Frontend**:
```javascript
// In browser console or component
console.log(process.env.NEXT_PUBLIC_API_URL);
console.log(process.env.NEXT_PUBLIC_PRIMARY_CURRENCY);
```

---

## Troubleshooting

### Issue: Currency not updating
- Check `NEXT_PUBLIC_PRIMARY_CURRENCY` and `NEXT_PUBLIC_SECONDARY_CURRENCY` in `.env.local`
- Restart Next.js dev server after changing env vars
- Rebuild frontend: `npm run build`

### Issue: CORS errors in production
- Ensure `CORS_ALLOWED_ORIGINS` includes your frontend domain
- Clear config cache: `php artisan config:clear`

### Issue: PHP path not found in scripts
- Set `PHP_PATH` environment variable
- Or ensure PHP is in system PATH
- Or update script with your PHP path

### Issue: API URL incorrect
- Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`
- For production behind reverse proxy, use relative path: `/api/v1`
- For development, use full URL: `http://localhost:8000/api/v1`

---

## Best Practices

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Use different values per environment** - Dev, staging, production
3. **Validate required variables** - Add startup checks if needed
4. **Document all variables** - Keep `.env.example` files updated
5. **Use secrets management** - For production (AWS Secrets Manager, Vault, etc.)
6. **Test configuration** - Verify all env vars are loaded correctly

---

## Status

✅ **All configurations are now environment-driven**

The application is ready for deployment across different environments without code changes.

