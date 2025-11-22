# Super User Guide

## Overview

The super user feature allows a user with the `super_admin` role to view and manage all properties and units across all landlords in the system. This is useful for system administrators who need to oversee multiple landlord accounts.

## Implementation Details

### 1. Database Changes

A migration has been added to:
- Add `super_admin` to the user role enum
- Make `landlord_id` nullable (super admins can optionally have a landlord_id or null)

**Migration File:** `backend/database/migrations/2025_11_21_000000_add_super_admin_role_and_nullable_landlord_id.php`

### 2. User Model Updates

The `User` model now includes:
- `ROLE_SUPER_ADMIN` constant
- `isSuperAdmin()` method to check if a user is a super admin

### 3. Authorization Changes

**Policies:**
- `HandlesLandlordAuthorization` trait updated to bypass landlord checks for super admins
- Super admins can view, create, update, and delete any property or unit regardless of landlord

**Controllers:**
- `PropertyController` and `UnitController` updated to skip landlord filtering for super admins
- Super admins see all properties/units when listing
- Regular users continue to see only their landlord's properties/units

### 4. API Behavior

#### For Regular Users (Owner, Admin, Manager, Agent):
- Can only view/manage properties and units belonging to their landlord
- `landlord_id` is automatically set from their user record
- Cannot specify `landlord_id` when creating resources

#### For Super Admins:
- Can view all properties and units across all landlords
- **Must specify `landlord_id`** when creating properties or units
- Can update any property or unit regardless of landlord
- Can specify `landlord_id` when updating resources

## Creating a Super Admin User

### Via Database

```sql
-- Option 1: Super admin with a landlord_id (still has access to all)
INSERT INTO users (landlord_id, first_name, last_name, email, mobile, password_hash, role, is_active, created_at, updated_at)
VALUES (1, 'Super', 'Admin', 'superadmin@example.com', '1234567890', '$2y$10$...', 'super_admin', 1, NOW(), NOW());

-- Option 2: Super admin without landlord_id (null is allowed)
INSERT INTO users (landlord_id, first_name, last_name, email, mobile, password_hash, role, is_active, created_at, updated_at)
VALUES (NULL, 'Super', 'Admin', 'superadmin@example.com', '1234567890', '$2y$10$...', 'super_admin', 1, NOW(), NOW());
```

### Via Laravel Seeder or Artisan

```php
use App\Models\User;
use Illuminate\Support\Facades\Hash;

$superAdmin = User::create([
    'landlord_id' => null, // Can be null for super admin
    'first_name' => 'Super',
    'last_name' => 'Admin',
    'email' => 'superadmin@example.com',
    'mobile' => '1234567890',
    'password_hash' => Hash::make('your-secure-password'),
    'role' => User::ROLE_SUPER_ADMIN,
    'is_active' => true,
]);
```

## API Usage Examples

### Creating a Property (Super Admin)

```http
POST /api/v1/properties
Authorization: Bearer {super_admin_token}
Content-Type: application/json

{
  "name": "Ocean View Apartments",
  "address": "Beach Road, Malé",
  "type": "residential",
  "landlord_id": 2  // REQUIRED for super admin
}
```

### Listing All Properties (Super Admin)

```http
GET /api/v1/properties
Authorization: Bearer {super_admin_token}
```

**Response:** Returns all properties from all landlords

### Creating a Unit (Super Admin)

```http
POST /api/v1/units
Authorization: Bearer {super_admin_token}
Content-Type: application/json

{
  "property_id": 5,
  "unit_type_id": 1,
  "unit_number": "101",
  "rent_amount": 5000.00,
  "security_deposit": 10000.00,
  "is_occupied": false,
  "landlord_id": 2  // REQUIRED for super admin
}
```

### Listing All Units (Super Admin)

```http
GET /api/v1/units
Authorization: Bearer {super_admin_token}
```

**Response:** Returns all units from all landlords

## Security Considerations

1. **Super Admin Privileges**: Super admins have full access to all landlord data. Use this role carefully and only assign it to trusted administrators.

2. **Password Security**: Ensure super admin accounts use strong, unique passwords.

3. **Token Management**: Monitor super admin API token usage and implement token expiration policies.

4. **Audit Logging**: Consider implementing audit logs to track super admin actions across landlords.

5. **Landlord ID Requirement**: Super admins must explicitly specify `landlord_id` when creating resources to ensure data is associated with the correct landlord account.

## Migration Instructions

To apply the super admin feature to your database:

```bash
cd backend
php artisan migrate
```

This will:
- Add `super_admin` to the role enum
- Make `landlord_id` nullable in the users table
- Update the foreign key constraint to allow null values

## Testing

To test the super admin functionality:

1. Create a super admin user
2. Generate an API token for the super admin
3. Test listing properties/units (should see all)
4. Test creating a property/unit with `landlord_id` specified
5. Verify regular users still only see their landlord's data

## Notes

- Super admins can optionally have a `landlord_id` or it can be `null`
- The super admin role is separate from regular admin roles
- All existing policies and authorization checks have been updated to support super admins
- The feature is backward compatible - existing users and functionality are unaffected

