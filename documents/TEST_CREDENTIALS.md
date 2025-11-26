# Test Login Credentials

## Current User in Database

Based on the database, there is currently one user:

**Email:** `admin@rent.issey.dev`  
**Role:** `super_admin`  
**Status:** Active

## Password

The password is not stored in plain text. You have a few options:

### Option 1: Reset Password via Tinker

SSH into your server and run:

```bash
cd /var/www/webapp/backend
php artisan tinker
```

Then in tinker:

```php
$user = App\Models\User::where('email', 'admin@rent.issey.dev')->first();
$user->password = 'YourNewPassword123!';
$user->save();
exit
```

### Option 2: Create a New Test User

Run the seeder to create demo users:

```bash
cd /var/www/webapp/backend
php artisan db:seed --class=DemoDataSeeder
```

This will create test users with password: `Password123!`

### Option 3: Check if Default Password Works

Try these common passwords:
- `Password123!`
- `password`
- `admin123`
- `admin`

## Demo Users (After Running Seeder)

If you run `DemoDataSeeder`, you'll get these test accounts:

| Role | Email | Password | Name |
|------|-------|----------|------|
| Owner | `owner@rentapp.test` | `Password123!` | Aisha Ibrahim |
| Admin | `admin@rentapp.test` | `Password123!` | Moosa Hassan |
| Manager | `manager@rentapp.test` | `Password123!` | Ziyad Abdul |
| Agent | `agent@rentapp.test` | `Password123!` | Raisa Ahmed |

## Quick Password Reset Command

To quickly reset the admin password to `Password123!`:

```bash
cd /var/www/webapp/backend
php artisan tinker --execute="App\Models\User::where('email', 'admin@rent.issey.dev')->update(['password' => 'Password123!']); echo 'Password reset complete';"
```

## Application URL

Your application should be accessible at:
- `https://rent.issey.dev` (if domain is configured)
- Or the IP address configured in your GitHub Secrets

---

**Note:** Always use strong passwords in production. These are for testing only.

