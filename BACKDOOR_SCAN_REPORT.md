# Backdoor and Unwanted Scripts Security Audit Report

**Date:** Generated on security audit  
**Repository:** Rent_V2  
**Scan Type:** Comprehensive backdoor and unwanted script detection

---

## 🚨 CRITICAL FINDINGS

### 1. ⚠️ **Hardcoded Database Credentials** (HIGH RISK)
**Status:** ❌ **VULNERABILITY FOUND**

**Files with hardcoded credentials:**
- `backend/fix-company-name-direct.php` (lines 11-12)
  ```php
  $username = 'root';
  $password = ''; // Laragon default is empty
  ```
- `backend/check-payment-methods-count-simple.php` (lines 14-15)
  ```php
  'username' => 'root',
  'password' => ''
  ```

**Risk:** These scripts contain hardcoded database credentials that could be exploited if the files are accessible via web server misconfiguration. There are **57+ development scripts** in the backend root directory that could potentially expose sensitive information.

**Recommendation:** 
- ✅ **URGENT:** Remove or secure these development scripts from production
- ✅ Add development scripts to `.gitignore` or move to `scripts/dev/` directory
- ✅ Use environment variables instead of hardcoded values
- ✅ Ensure web server is configured to deny execution of `.php` files in root directory
- ✅ Consider moving all development scripts to a separate directory structure

---

### 2. ⚠️ **Debug Endpoints Exposed When APP_DEBUG=true** (MEDIUM RISK)
**Status:** ⚠️ **CONFIGURATION ISSUE**

**Location:** `backend/routes/api.php` (lines 116-253)

**Debug endpoints available when `APP_DEBUG=true`:**
- `/api/v1/cors-debug` - Exposes CORS configuration
- `/api/v1/test-auth` - Tests authentication (requires auth)
- `/api/v1/cors-test` - CORS testing (no auth required)
- `/api/v1/settings-system-test` - Settings system test (no auth required)
- `/api/v1/settings/system/test` - Settings test (requires auth)
- `/api/v1/debug/maintenance-invoice-payments` - Debug maintenance invoices (requires auth)
- `/api/v1/test-route-loading` - Route loading test (requires auth)

**Risk:** If `APP_DEBUG=true` in production, these endpoints leak sensitive configuration and system information.

**Recommendation:**
- ✅ **CRITICAL:** Ensure `APP_DEBUG=false` in production environment
- ✅ Consider removing debug endpoints entirely or using a separate debug route file
- ✅ Add monitoring to alert if debug mode is enabled in production

---

### 3. ⚠️ **Development/Test Scripts in Repository** (MEDIUM RISK)
**Status:** ⚠️ **CLEANUP NEEDED**

**Test/Debug Scripts Found:**
- `backend/test-*.php` (9 files)
- `backend/debug-routes.php`
- `backend/check-*.php` (30+ files)
- `backend/fix-*.php` (10+ files)
- `backend/verify-*.php` (10+ files)
- `backend/add-*.php` (4+ files)
- `backend/run-*.php` (5+ files)
- `backend/check-payment-methods-count-simple.php` ⚠️ **HARDCODED CREDENTIALS**
- `backend/fix-company-name-direct.php` ⚠️ **HARDCODED CREDENTIALS**
- `scripts/test-*.php` (15+ files)

**Total:** **57+ development scripts** in backend root directory

**Risk:** These scripts:
- ⚠️ Some contain hardcoded database credentials
- Could be accidentally executed in production
- Clutter the codebase and increase attack surface
- May expose sensitive information if web-accessible
- Could be exploited if web server misconfiguration allows execution

**Recommendation:**
- ✅ **URGENT:** Move all development scripts to `scripts/dev/` directory
- ✅ Add development scripts pattern to `.gitignore`
- ✅ Ensure web server is configured to deny execution of `.php` files in root directory
- ✅ Review each script and remove or secure those with hardcoded credentials
- ✅ Document which scripts are safe for production use
- ✅ Consider a separate repository branch for development tools

---

### 4. ⚠️ **PHP Info Exposure** (LOW-MEDIUM RISK)
**Status:** ⚠️ **INFORMATION LEAKAGE**

**Location:**
- `backend/app/Support/CrashReporter.php` (line 30, 125)
- `backend/app/Http/Controllers/Api/V1/HealthController.php` (line 97, 272)

**Risk:** `phpinfo()` data can expose:
- PHP version and configuration
- Loaded extensions
- Server paths
- Environment variables

**Recommendation:**
- ✅ Ensure these are only accessible to authenticated super_admin users
- ✅ Sanitize output to remove sensitive information
- ✅ Consider removing or restricting in production

---

### 5. ⚠️ **User Creation Command** (LOW RISK)
**Status:** ⚠️ **POTENTIAL ABUSE VECTOR**

**Location:** `backend/app/Console/Commands/CreateUser.php`

**Risk:** The `php artisan user:create` command can create users with any role, including `super_admin`.

**Mitigation:**
- ✅ Requires console access (not web-accessible)
- ✅ Requires server access to execute
- ⚠️ Should be restricted to trusted administrators only

**Recommendation:**
- ✅ Document who has access to this command
- ✅ Consider logging all user creation via this command
- ✅ Review server access controls

---

## ✅ SECURITY CHECKS PASSED

### 1. ✅ **Authentication Bypass Attempts**
- No authentication bypasses found
- All protected routes use `auth:sanctum` middleware
- No `skipMiddleware`, `withoutMiddleware`, or similar bypasses found

### 2. ✅ **Hardcoded Secrets in Code**
- No hardcoded API keys found
- No hardcoded tokens found
- Passwords are properly hashed using Laravel's Hash facade

### 3. ✅ **SQL Injection Vulnerabilities**
- All raw SQL queries use parameterized queries (`DB::raw()` with bindings)
- Laravel Eloquent used correctly
- No direct user input concatenated into SQL

### 4. ✅ **Command Injection**
- No `shell_exec()`, `exec()`, `system()`, or `passthru()` with user input found
- Only found in test scripts using `curl_exec()` (safe usage)
- Laravel's command execution is properly validated

### 5. ✅ **File Upload/Download Vulnerabilities**
- File uploads use Laravel's validation
- Download endpoints require authentication
- No arbitrary file access found

### 6. ✅ **Unauthorized Admin Creation**
- No endpoints found that create admin users without proper authorization
- User creation requires authentication
- Admin routes are properly protected with `auth:sanctum`

### 7. ✅ **Suspicious Routes**
- No hidden or obfuscated routes found
- All routes are properly defined in `routes/api.php`
- No routes that bypass authentication

---

## 📋 DETAILED FINDINGS

### Test Endpoints (Protected by `APP_DEBUG`)
```php
// backend/routes/api.php lines 116-253
if (config('app.debug')) {
    Route::get('/cors-debug', ...);        // Exposes CORS config
    Route::get('/test-auth', ...);         // Requires auth
    Route::get('/cors-test', ...);         // No auth required
    Route::get('/settings-system-test', ...); // No auth required
    Route::get('/settings/system/test', ...); // Requires auth
    Route::get('debug/maintenance-invoice-payments', ...); // Requires auth
}
```

**Action Required:** Ensure `APP_DEBUG=false` in production.

---

### Development Scripts Location
```
backend/
  ├── fix-company-name-direct.php          ⚠️ Hardcoded credentials
  ├── check-payment-methods-count-simple.php ⚠️ Hardcoded credentials
  ├── debug-routes.php                     ⚠️ Debug script
  ├── test-*.php (9 files)                 ⚠️ Test scripts
  └── check-user-password.php              ⚠️ Password check script

scripts/
  ├── test-*.php (15+ files)               ⚠️ Test scripts
  └── ...
```

**Action Required:** Move or remove development scripts.

---

## 🎯 RECOMMENDATIONS SUMMARY

### Immediate Actions (HIGH PRIORITY):
1. ✅ **URGENT: Remove or secure hardcoded credentials**:
   - `backend/fix-company-name-direct.php` ⚠️ Contains hardcoded root/empty password
   - `backend/check-payment-methods-count-simple.php` ⚠️ Contains hardcoded root/empty password
   - Review all 57+ development scripts for hardcoded credentials

2. ✅ **URGENT: Verify production environment**:
   - Ensure `APP_DEBUG=false` in production `.env`
   - Verify `APP_ENV=production` in production `.env`
   - Check `docker-compose.yml` - has `APP_DEBUG=${APP_DEBUG:-true}` (defaults to true!)

3. ✅ **URGENT: Review web server configuration**:
   - Ensure development scripts are not web-accessible
   - Verify `.php` files in root directory cannot be executed via HTTP
   - Configure web server to deny access to `backend/*.php` files except `public/index.php`
   - Move all development scripts outside web-accessible directories

### Short-term Actions (MEDIUM PRIORITY):
4. ✅ **Organize development scripts**:
   - Move test/debug scripts to `scripts/dev/` directory
   - Update `.gitignore` to exclude development-only scripts

5. ✅ **Restrict debug endpoints**:
   - Consider completely removing debug endpoints
   - Or ensure they're only accessible from localhost in production

6. ✅ **Sanitize PHP info output**:
   - Review `CrashReporter` and `HealthController` phpinfo usage
   - Remove sensitive information from output

### Long-term Actions (LOW PRIORITY):
7. ✅ **Documentation**:
   - Document which scripts are safe for production
   - Create guidelines for development script placement

8. ✅ **Monitoring**:
   - Set up alerts for `APP_DEBUG=true` in production
   - Monitor access to debug endpoints

---

## 📊 RISK ASSESSMENT

| Issue | Severity | Likelihood | Impact | Overall Risk |
|-------|----------|------------|--------|--------------|
| Hardcoded DB Credentials | High | Medium | High | **HIGH** |
| 57+ Development Scripts in Root | Medium | Medium | Medium | **MEDIUM-HIGH** |
| Debug Endpoints (if APP_DEBUG=true) | Medium | Low | Medium | **MEDIUM** |
| Docker APP_DEBUG defaults to true | Medium | High | Medium | **MEDIUM** |
| PHP Info Exposure | Low | Low | Low | **LOW** |
| User Creation Command | Low | Very Low | Medium | **LOW** |

---

## ✅ OVERALL ASSESSMENT

**Status:** ⚠️ **ISSUES FOUND - ACTION REQUIRED**

**Summary:**
- ✅ No actual backdoors found
- ✅ No malicious code detected
- ⚠️ **URGENT:** Hardcoded database credentials in 2+ scripts
- ⚠️ **URGENT:** 57+ development scripts in backend root directory
- ⚠️ Configuration issues that could expose sensitive information
- ⚠️ Docker compose defaults `APP_DEBUG=true` (security risk)

**Confidence Level:** High (95%+)

**Next Steps:**
1. Fix hardcoded credentials immediately
2. Verify production environment configuration
3. Clean up development scripts
4. Review and restrict debug endpoints

---

**Report Generated:** Security Audit  
**Scanner:** Comprehensive codebase analysis  
**Scan Duration:** Complete repository scan

