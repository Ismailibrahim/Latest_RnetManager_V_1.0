# Testing Guide for RentApplication

This guide provides comprehensive instructions for testing the RentApplication system, including setup, workflow, and best practices.

## Table of Contents

1. [Pre-Testing Setup](#pre-testing-setup)
2. [Testing Workflow](#testing-workflow)
3. [Testing Order](#testing-order)
4. [Automated Testing](#automated-testing)
5. [Manual Testing](#manual-testing)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Pre-Testing Setup

### 1. Environment Setup

#### Backend Setup
```bash
cd backend

# Install dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Configure database in .env file
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=rentapp
# DB_USERNAME=root
# DB_PASSWORD=

# Run migrations
php artisan migrate

# Seed database with comprehensive test data
php artisan db:seed

# Clear cache
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Start backend server
php artisan serve
```

#### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Configure API URL in .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Start frontend dev server
npm run dev
```

### 2. Test Data Generation

#### Basic Demo Data
The `DemoDataSeeder` creates:
- 1 landlord (RentApplicaiton Demo Estates)
- 4 users (owner, admin, manager, agent)
- 2 properties (Coral View Apartments, Lagoon Plaza)
- 8 units (4 per property)
- 5 tenants
- Basic tenant unit assignments

#### Comprehensive Report Data
The `ComprehensiveReportDataSeeder` creates:
- 12+ months of rent invoices
- Financial records (rent, maintenance, other income/outgoing)
- Security deposit refunds
- Maintenance requests and invoices
- Unit occupancy history
- Vendors

To run comprehensive seeder:
```bash
php artisan db:seed --class=ComprehensiveReportDataSeeder
```

Or run all seeders:
```bash
php artisan db:seed
```

### 3. Test User Credentials

Default test users (from DemoDataSeeder):
- **Owner:** owner@rentapp.test / Password123!
- **Admin:** admin@rentapp.test / Password123!
- **Manager:** manager@rentapp.test / Password123!
- **Agent:** agent@rentapp.test / Password123!

### 4. Database Configuration

For testing, use a separate test database:

```bash
# Create test database
mysql -u root -e "CREATE DATABASE IF NOT EXISTS rentapp_test;"

# Update phpunit.xml or .env.testing
# DB_DATABASE=rentapp_test
```

## Testing Workflow

### 1. Preparation Phase

1. **Backup Current Data** (if testing on production-like data)
   ```bash
   php artisan db:backup  # if available
   # or
   mysqldump -u root rentapp > backup.sql
   ```

2. **Reset Database** (optional, for clean slate)
   ```bash
   php artisan migrate:fresh --seed
   ```

3. **Verify Services Running**
   - Backend API: http://localhost:8000
   - Frontend App: http://localhost:3000
   - Database: MySQL running

4. **Clear All Caches**
   ```bash
   php artisan cache:clear
   php artisan config:clear
   php artisan route:clear
   php artisan view:clear
   ```

### 2. Testing Phase

1. **Start with Automated Tests**
   - Run backend API tests
   - Run frontend component tests
   - Fix any failing tests

2. **Proceed with Manual Testing**
   - Follow the testing checklist (TESTING_CHECKLIST.md)
   - Test each page systematically
   - Document any issues found

3. **Test Edge Cases**
   - Empty states
   - Large datasets
   - Invalid inputs
   - Network errors
   - Permission boundaries

### 3. Documentation Phase

1. **Document Issues**
   - Create bug reports with steps to reproduce
   - Note any unexpected behaviors
   - Document workarounds

2. **Update Test Results**
   - Mark checklist items as complete
   - Note any skipped tests and reasons
   - Document test coverage

## Testing Order

Follow this order for systematic testing:

### Phase 1: Foundation (Core Entities)
1. **Properties** (`/properties`)
   - Create, read, update, delete
   - Verify cascade behavior with units

2. **Units** (`/units`)
   - CRUD operations
   - Bulk import functionality
   - Occupancy status management

3. **Tenants** (`/tenants`)
   - CRUD operations
   - Bulk import
   - Document management

4. **Tenant Units** (`/tenant-units`)
   - Assignment creation
   - Lease management
   - Advance rent collection

### Phase 2: Financial Management
1. **Rent Invoices** (`/rent-invoices`)
   - Single invoice generation
   - Bulk generation
   - Status transitions
   - Export functionality

2. **Unified Payments** (`/unified-payments`)
   - List view with filters
   - Payment type filtering
   - Date range filtering

3. **Collect Payment** (`/payments/collect`)
   - All payment types
   - Form validation
   - Success/error flows

4. **Security Deposit Refunds** (`/security-deposit-refunds`)
   - Refund creation
   - Status management
   - Receipt generation

5. **Finances** (`/finances`)
   - Dashboard widgets
   - Cash flow visualization
   - Collection pipeline

### Phase 3: Maintenance Management
1. **Maintenance Requests** (`/maintenance`)
   - Request creation
   - Status updates
   - Cost tracking

2. **Maintenance Invoices** (`/maintenance-invoices`)
   - Invoice creation
   - Line items management
   - Payment tracking

### Phase 4: Asset Management
1. **Asset Types** (`/asset-types`)
   - Type management
   - Category organization

2. **Assets** (`/assets`)
   - Asset tracking
   - Ownership management
   - Maintenance history

### Phase 5: Settings & Configuration
1. **System Settings** (`/settings/system`)
   - Company information
   - Currency configuration
   - Invoice numbering
   - Notification settings

2. **Account Settings** (`/settings/account`)
   - Profile management
   - Password changes
   - Delegate management

### Phase 6: Reports & Analytics
1. **Overview** (`/`)
   - Dashboard widgets
   - Statistics accuracy

2. **Snapshot** (`/snapshot`)
   - Chart rendering
   - Data accuracy

3. **Reports** (`/reports`)
   - Report generation
   - Export functionality

### Phase 7: Other Features
1. **Notifications** (`/notifications`)
   - Notification display
   - Mark as read
   - Delete functionality

2. **Vendors** (`/vendors`)
   - Vendor management
   - Service categories

## Automated Testing

### Backend API Tests

#### Running Tests
```bash
cd backend

# Run all tests
php artisan test

# Run specific test suite
php artisan test --testsuite=Feature
php artisan test --testsuite=Unit

# Run specific test file
php artisan test tests/Feature/Api/V1/PropertyApiTest.php

# Run with coverage
php artisan test --coverage

# Run in parallel (if configured)
php artisan test --parallel
```

#### Test Structure
```
backend/tests/
├── Feature/
│   └── Api/
│       └── V1/
│           ├── PropertyApiTest.php
│           ├── UnitApiTest.php
│           ├── TenantApiTest.php
│           └── ...
├── Unit/
│   └── Services/
│       └── ...
├── Traits/
│   ├── AuthenticatesUsers.php
│   ├── CreatesTestData.php
│   └── MakesApiRequests.php
└── TestCase.php
```

#### Writing Tests
```php
<?php

namespace Tests\Feature\Api\V1;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\AuthenticatesUsers;
use Tests\Traits\CreatesTestData;
use Tests\Traits\MakesApiRequests;

class MyApiTest extends TestCase
{
    use RefreshDatabase;
    use AuthenticatesUsers;
    use CreatesTestData;
    use MakesApiRequests;

    public function test_owner_can_list_resources(): void
    {
        $user = $this->actingAsOwner();
        
        // Create test data
        $data = $this->createPropertyWithTenant(['landlord' => $user->landlord]);
        
        // Make API request
        $response = $this->getApi('/properties');
        
        // Assert response
        $this->assertApiResponseStructure($response, [
            '*' => ['id', 'name', 'address'],
        ]);
    }
}
```

### Frontend Component Tests

#### Running Tests
```bash
cd frontend

# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

#### Test Structure
```
frontend/
├── __tests__/
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   └── utils/
├── jest.config.js
└── jest.setup.js
```

#### Writing Tests
```jsx
import { render, screen } from '@testing-library/react'
import { MyComponent } from '@/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

## Manual Testing

### Using the Checklist

1. **Open TESTING_CHECKLIST.md**
2. **Navigate to the page section you're testing**
3. **Follow each checklist item systematically**
4. **Mark items as complete when tested**
5. **Note any issues or bugs found**

### Testing Scenarios

#### Happy Path Testing
- Test the normal, expected flow
- All inputs are valid
- All operations succeed

#### Edge Case Testing
- Empty states (no data)
- Large datasets (pagination)
- Boundary values (min/max)
- Invalid inputs (validation)

#### Error Handling Testing
- Network failures
- Invalid API responses
- Database errors
- Permission errors

#### Cross-Browser Testing
- Chrome
- Firefox
- Safari
- Edge

#### Responsive Testing
- Mobile (< 768px)
- Tablet (768px - 1024px)
- Desktop (> 1024px)

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Don't rely on test execution order
- Use `RefreshDatabase` for feature tests
- Clean up test data after each test

### 2. Test Data Management
- Use factories for test data creation
- Use seeders for comprehensive scenarios
- Don't rely on production data
- Create minimal data needed for each test

### 3. Assertions
- Be specific with assertions
- Test both success and failure cases
- Verify data persistence
- Check response structures

### 4. Documentation
- Document test scenarios
- Keep test names descriptive
- Add comments for complex tests
- Update checklists as features change

### 5. Performance
- Keep tests fast
- Use database transactions where possible
- Mock external services
- Avoid unnecessary setup

### 6. Coverage
- Aim for high code coverage (>80%)
- Focus on critical paths
- Test edge cases
- Don't sacrifice quality for coverage

## Troubleshooting

### Common Issues

#### Backend Tests Failing

**Issue:** Database connection errors
```bash
# Solution: Check database configuration
php artisan config:clear
# Verify .env.testing or phpunit.xml has correct DB settings
```

**Issue:** Migration errors
```bash
# Solution: Reset database
php artisan migrate:fresh
```

**Issue:** Authentication errors
```bash
# Solution: Check Sanctum configuration
php artisan config:clear
# Verify API routes are correct
```

#### Frontend Tests Failing

**Issue:** Module not found
```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Issue:** API mocking issues
```bash
# Solution: Check jest.setup.js mocks
# Verify API_BASE_URL configuration
```

#### Manual Testing Issues

**Issue:** Data not appearing
```bash
# Solution: Run seeders
php artisan db:seed
# Clear cache
php artisan cache:clear
```

**Issue:** API errors
```bash
# Solution: Check backend server is running
# Verify API_BASE_URL in frontend .env
# Check CORS configuration
```

**Issue:** Authentication not working
```bash
# Solution: Clear browser localStorage
# Verify token is being stored
# Check API authentication middleware
```

### Debugging Tips

1. **Check Logs**
   ```bash
   # Laravel logs
   tail -f backend/storage/logs/laravel.log
   
   # Browser console
   # Open DevTools → Console
   ```

2. **Use Debugging Tools**
   - Laravel Debugbar
   - Browser DevTools
   - Network tab for API calls
   - React DevTools for frontend

3. **Verify Data**
   ```bash
   # Check database
   php artisan tinker
   # Then: Property::count()
   ```

4. **Test API Directly**
   ```bash
   # Use curl or Postman
   curl -H "Authorization: Bearer TOKEN" http://localhost:8000/api/v1/properties
   ```

## Test Data Requirements

For comprehensive testing, ensure you have:

- **Properties:** At least 5 (mix of residential/commercial)
- **Units:** At least 20 (various types, occupancy statuses)
- **Tenants:** At least 10 (active and inactive)
- **Tenant Units:** At least 8 active assignments
- **Rent Invoices:** 12+ months of data
- **Financial Records:** Various types and statuses
- **Maintenance Requests:** Various types and statuses
- **Maintenance Invoices:** Paid, pending, overdue
- **Security Deposits:** Some refunds created
- **Assets:** Various types and ownerships
- **Vendors:** Multiple service categories
- **Payment Methods:** Multiple methods configured

## Continuous Integration

### GitHub Actions

Tests should run automatically on:
- Pull requests
- Pushes to main branch
- Scheduled runs (optional)

### Local CI Simulation

```bash
# Run all tests locally
cd backend && php artisan test
cd ../frontend && npm test
```

## Reporting

### Test Results

Document:
- Total tests run
- Tests passed
- Tests failed
- Coverage percentage
- Issues found

### Bug Reports

Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots/logs
- Environment details

## Conclusion

Following this guide ensures comprehensive testing of the RentApplication system. Regular testing helps maintain code quality and catch issues early.

For specific test cases, refer to:
- `TESTING_CHECKLIST.md` - Detailed manual testing checklist
- `backend/tests/README.md` - Backend testing documentation
- `frontend/README-TESTING.md` - Frontend testing documentation

