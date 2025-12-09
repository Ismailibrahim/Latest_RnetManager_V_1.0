# API Testing Guide

## Quick Testing Commands

### 1. Test Health Endpoint
```bash
curl -X GET http://localhost:8000/api/health
```

Expected Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-22T12:00:00Z",
  "database": "connected"
}
```

### 2. Test CORS Headers
```bash
# Test OPTIONS request (preflight)
curl -X OPTIONS http://localhost:8000/api/v1/ \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Check for these headers in response:
# Access-Control-Allow-Origin: http://localhost:3000
# Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
# Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept
# Access-Control-Allow-Credentials: true
```

### 3. Test Authentication
```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword",
    "device_name": "test-device"
  }'

# Use the token from response
TOKEN="your-token-here"

# Get current user
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json"
```

### 4. Test Protected Endpoints

```bash
# Get properties
curl -X GET http://localhost:8000/api/v1/properties \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json"

# Get units
curl -X GET http://localhost:8000/api/v1/units \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json"

# Get tenants
curl -X GET http://localhost:8000/api/v1/tenants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json"
```

### 5. Test Performance

```bash
# Time the request
time curl -X GET http://localhost:8000/api/v1/units \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json"

# Expected: Should complete in < 200ms for typical datasets
```

## Response Format Verification

### Collection Response (Paginated)
```json
{
  "data": [...],
  "links": {
    "first": "...",
    "last": "...",
    "prev": null,
    "next": "..."
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 5,
    "per_page": 15,
    "to": 15,
    "total": 75
  }
}
```

### Single Resource Response
```json
{
  "data": {
    "id": 1,
    "name": "...",
    "created_at": "2025-01-22T12:00:00.000000Z",
    "updated_at": "2025-01-22T12:00:00.000000Z"
  }
}
```

### Error Response
```json
{
  "message": "Validation error",
  "errors": {
    "field_name": ["Error message"]
  }
}
```

## Mobile App Testing (Flutter)

### 1. iOS Simulator
```dart
// Test CORS from Flutter web
final response = await http.get(
  Uri.parse('http://localhost:8000/api/v1/health'),
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
);
```

### 2. Android Emulator
- Use `http://10.0.2.2:8000` instead of `localhost:8000`
- Or use your machine's local IP: `http://192.168.1.xxx:8000`

### 3. Physical Device
- Use your machine's local IP address
- Ensure both devices are on the same network
- Update CORS_ALLOWED_ORIGINS in .env to include your IP

## Performance Benchmarks

### Expected Response Times:
- Health check: < 50ms
- Auth endpoints: < 100ms
- List endpoints (paginated): < 200ms
- Detail endpoints: < 150ms
- Create/Update endpoints: < 300ms

### Database Query Counts:
- List endpoints: 2-3 queries (main query + count + relationships)
- Detail endpoints: 1-2 queries (main query + relationships)
- No N+1 queries should occur

## Common Issues and Solutions

### CORS Errors
**Problem**: `Access-Control-Allow-Origin` header missing

**Solution**:
1. Check `ForceCors` middleware is loaded
2. Verify CORS config in `config/cors.php`
3. Check `.env` for `CORS_ALLOWED_ORIGINS`
4. Restart Laravel server after config changes

### Slow Response Times
**Problem**: API responses are slow (> 500ms)

**Solution**:
1. Check database indexes exist
2. Verify eager loading is used
3. Check for N+1 queries in Laravel Debugbar
4. Consider adding query result caching

### Invalid JSON Response
**Problem**: Response is not valid JSON

**Solution**:
1. Check for PHP errors/warnings in response
2. Verify all controllers return proper JSON responses
3. Check Laravel logs for exceptions
4. Ensure Resource classes are properly formatted

### Authentication Errors
**Problem**: 401 Unauthorized errors

**Solution**:
1. Verify token is valid and not expired
2. Check token is sent in Authorization header
3. Format: `Authorization: Bearer {token}`
4. Ensure user is active in database

## Automated Testing

### Run PHP Test Script
```bash
cd backend
php test-api-endpoints.php
```

### Run Laravel Tests
```bash
cd backend
php artisan test
```

## Monitoring

### Check API Logs
```bash
tail -f backend/storage/logs/laravel.log
```

### Monitor Performance
- Enable Laravel Debugbar in development
- Use Laravel Telescope for detailed monitoring
- Check database slow query log
