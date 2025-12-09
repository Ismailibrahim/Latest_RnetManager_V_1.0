# Frontend Console.log Replacement Guide

## Overview
This guide documents the process for replacing `console.log`, `console.error`, `console.warn`, and `console.info` statements with the proper logger utility.

## Status
- **Total console statements found:** 158+
- **Logger utility:** `frontend/utils/logger.js` (already exists)
- **Replacement pattern:** Use `logger` instead of `console`

## Replacement Pattern

### Before:
```javascript
console.log("Debug message", data);
console.error("Error occurred", error);
console.warn("Warning message");
console.info("Info message");
```

### After:
```javascript
import { logger } from "@/utils/logger";

logger.debug("Debug message", data);
logger.error("Error occurred", error);
logger.warn("Warning message");
logger.info("Info message");
```

## Files Requiring Updates

Based on the code review, the following files have the most console statements:

1. `frontend/app/(dashboard)/payments/collect/page.jsx` (15+ statements)
2. `frontend/app/(dashboard)/maintenance-invoices/page.jsx` (8+ statements)
3. `frontend/app/(dashboard)/reports/occupancy/page.jsx` (1 statement)
4. `frontend/app/(dashboard)/reports/financial-summary/page.jsx` (1 statement)
5. `frontend/hooks/useAdminSubscriptions.js` (3 statements)
6. `frontend/hooks/useSystemSettings.js` (multiple statements)
7. `frontend/utils/printDocument.js` (multiple statements)
8. `frontend/components/ErrorBoundary.jsx` (1 statement)
9. `frontend/app/error.jsx` (1 statement)

## Automated Replacement Script

You can use the following approach to replace console statements:

### Using find and replace in your IDE:
1. Find: `console\.(log|error|warn|info|debug)`
2. Replace with: `logger.$1` (after importing logger)

### Manual Steps:
1. Add import at top of file: `import { logger } from "@/utils/logger";`
2. Replace `console.log` → `logger.debug`
3. Replace `console.error` → `logger.error`
4. Replace `console.warn` → `logger.warn`
5. Replace `console.info` → `logger.info`
6. Replace `console.debug` → `logger.debug`

## Important Notes

1. **Logger only logs in development mode** - This is intentional to prevent console pollution in production
2. **Error tracking** - Consider integrating Sentry or similar service for production error tracking
3. **Keep critical errors** - Some console.error statements might need to remain for critical errors that should always be logged

## Priority Files

### High Priority (User-facing pages):
- `frontend/app/(dashboard)/payments/collect/page.jsx`
- `frontend/app/(dashboard)/maintenance-invoices/page.jsx`
- `frontend/app/(dashboard)/admin/subscriptions/page.jsx` (already fixed)

### Medium Priority (Hooks and utilities):
- `frontend/hooks/useAdminSubscriptions.js`
- `frontend/hooks/useSystemSettings.js`
- `frontend/utils/printDocument.js`

### Low Priority (Error boundaries):
- `frontend/components/ErrorBoundary.jsx`
- `frontend/app/error.jsx`

## Verification

After replacement, verify:
1. No `console.log` statements remain (except in logger.js itself)
2. All logger imports are present
3. Application still works correctly
4. Console is clean in production builds

