# Backend Testing Guide

This project uses **PHPUnit** for backend testing with Laravel's testing features.

## Setup

Install dependencies:

```bash
cd backend
composer install
```

## Running Tests

```bash
# Run all tests
php artisan test

# Run specific test suite
php artisan test --testsuite=Unit
php artisan test --testsuite=Feature

# Run specific test file
php artisan test tests/Feature/Api/V1/PropertyApiTest.php

# Run with coverage
php artisan test --coverage
```

## Test Structure

```
backend/tests/
├── Feature/          # Feature/integration tests
│   └── Api/         # API endpoint tests
├── Unit/             # Unit tests
├── Traits/           # Reusable test traits
│   ├── AuthenticatesUsers.php
│   ├── CreatesTestData.php
│   └── MakesApiRequests.php
├── TestCase.php      # Base test case with helpers
└── README.md         # This file
```

## Writing Tests

### Feature Tests (API Endpoints)

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

### Unit Tests

```php
<?php

namespace Tests\Unit;

use App\Services\MyService;
use Tests\TestCase;

class MyServiceTest extends TestCase
{
    public function test_service_calculates_correctly(): void
    {
        $service = new MyService();
        $result = $service->calculate(10, 20);
        
        $this->assertEquals(30, $result);
    }
}
```

## Test Traits

### AuthenticatesUsers

Provides helper methods for authenticating users:

```php
use Tests\Traits\AuthenticatesUsers;

class MyTest extends TestCase
{
    use AuthenticatesUsers;

    public function test_something(): void
    {
        $owner = $this->actingAsOwner();
        $admin = $this->actingAsAdmin();
        $manager = $this->actingAsManager();
        $agent = $this->actingAsAgent();
    }
}
```

### CreatesTestData

Provides helper methods for creating test data:

```php
use Tests\Traits\CreatesTestData;

class MyTest extends TestCase
{
    use CreatesTestData;

    public function test_something(): void
    {
        // Create complete property setup
        $data = $this->createPropertyWithTenant();
        // Returns: ['landlord', 'property', 'unit', 'tenant', 'tenantUnit']
        
        // Create specific entities
        $financialRecord = $this->createFinancialRecord($data['tenantUnit']);
        $rentInvoice = $this->createRentInvoice($data['tenantUnit']);
        $maintenanceRequest = $this->createMaintenanceRequest($data['unit']);
        $asset = $this->createAsset($data['unit']);
    }
}
```

### MakesApiRequests

Provides helper methods for making API requests:

```php
use Tests\Traits\MakesApiRequests;

class MyTest extends TestCase
{
    use MakesApiRequests;

    public function test_api_endpoint(): void
    {
        $response = $this->getApi('/properties');
        $this->assertApiResponseStructure($response);
        
        $response = $this->postApi('/properties', ['name' => 'Test']);
        $this->assertValidationError($response, 'address');
        
        $response = $this->deleteApi('/properties/1');
        $response->assertOk();
    }
}
```

## Best Practices

1. **Use RefreshDatabase for feature tests**
   - Ensures a clean database state for each test
   - Use `use RefreshDatabase;` in your test class

2. **Use factories for test data**
   - Create test data using model factories
   - Use the `CreatesTestData` trait for common scenarios

3. **Test user roles and permissions**
   - Test that owners can access resources
   - Test that unauthorized users are blocked
   - Use `AuthenticatesUsers` trait for consistent auth setup

4. **Test validation**
   - Test that invalid data is rejected
   - Use `assertValidationError()` helper

5. **Test API structure**
   - Ensure responses match expected structure
   - Use `assertApiResponseStructure()` helper

6. **Keep tests isolated**
   - Each test should be independent
   - Don't rely on test execution order

7. **Use descriptive test names**
   - Test names should clearly describe what is being tested
   - Use snake_case: `test_owner_can_create_property()`

## Database Configuration

Tests use a separate database configured in `phpunit.xml`:

```xml
<env name="DB_DATABASE" value="rentapp_test"/>
```

Make sure to create this database before running tests:

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS rentapp_test;"
```

## Coverage

Generate coverage reports:

```bash
php artisan test --coverage
```

Coverage reports are generated in `coverage/` directory.

