# Advance Rent Payment System - Complete Analysis Report

## Executive Summary

This report provides a comprehensive analysis of how advance rent payments work in your codebase. The system is designed for **landlords to collect advance rent from tenants**, with automatic application to invoices. Currently, **tenants cannot directly pay advance rent** through the mobile API - only landlords can record advance rent collection through the web dashboard.

---

## 1. How Advance Rent Payment Works

### 1.1 Current Payment Flow

**Important:** Advance rent is **collected by landlords**, not paid directly by tenants through the system.

#### Step-by-Step Process:

1. **Landlord Records Advance Rent Collection**
   - Location: Web Dashboard → `/advance-rent/collect`
   - Landlord fills out a form with:
     - Tenant Unit (lease)
     - Number of months (1-12)
     - Total amount
     - Payment method
     - Transaction date
     - Reference number (optional)
     - Notes (optional)

2. **System Processing**
   - Creates a `FinancialRecord` entry
   - Updates `TenantUnit` with:
     - `advance_rent_months`
     - `advance_rent_amount`
     - `advance_rent_used` (reset to 0)
     - `advance_rent_collected_date`

3. **Automatic Invoice Coverage**
   - When invoices are created, system automatically checks if they fall within the advance rent coverage period
   - Coverage period: From `lease_start` date for `advance_rent_months` months
   - If covered, advance rent is automatically applied to the invoice
   - Invoice status changes to "paid" if fully covered

---

## 2. API Endpoints

### 2.1 Collect Advance Rent (Landlord Only)

**Endpoint:** `POST /api/v1/tenant-units/{tenant_unit}/advance-rent`

**Authentication:** Required (Sanctum token)

**Authorization:** User must be landlord who owns the tenant unit

**Request Body:**
```json
{
  "advance_rent_months": 3,           // Required: 1-12
  "advance_rent_amount": 45000.00,    // Required: >= 0
  "payment_method": "cash",           // Optional: Must exist in payment_methods table
  "transaction_date": "2025-01-15",   // Required: Date format
  "reference_number": "TRX-12345",    // Optional: Max 100 chars
  "notes": "Advance rent for Q1"      // Optional: Max 500 chars
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "tenant": {...},
    "unit": {...},
    "advance_rent_months": 3,
    "advance_rent_amount": "45000.00",
    "advance_rent_used": "0.00",
    "advance_rent_remaining": "45000.00",
    "advance_rent_collected_date": "2025-01-15",
    ...
  }
}
```

### 2.2 Retroactively Apply Advance Rent

**Endpoint:** `POST /api/v1/tenant-units/{tenant_unit}/retroactive-advance-rent`

**Purpose:** Apply advance rent to existing invoices that fall within the coverage period

**Response:**
```json
{
  "message": "Retroactively applied advance rent to 3 invoice(s). Total amount applied: 45,000.00",
  "processed": 3,
  "applied": 45000.00,
  "invoices": [
    {
      "id": 1,
      "invoice_number": "INV-001",
      "invoice_date": "2025-01-01",
      "amount_applied": 15000.00,
      "total_applied": 15000.00,
      "fully_covered": true
    },
    ...
  ],
  "tenant_unit": {...}
}
```

---

## 3. Database Schema

### 3.1 Tenant Units Table

The `tenant_units` table stores advance rent information:

| Field | Type | Description |
|-------|------|-------------|
| `advance_rent_months` | integer | Number of months paid in advance |
| `advance_rent_amount` | decimal(10,2) | Total amount collected |
| `advance_rent_used` | decimal(10,2) | Amount already applied to invoices |
| `advance_rent_collected_date` | date | Date when advance rent was collected |

**Computed Field:**
- `advance_rent_remaining` = `advance_rent_amount` - `advance_rent_used`

### 3.2 Rent Invoices Table

The `rent_invoices` table tracks advance rent application:

| Field | Type | Description |
|-------|------|-------------|
| `advance_rent_applied` | decimal(10,2) | Amount of advance rent applied to this invoice |
| `is_advance_covered` | boolean | Whether invoice is fully covered by advance rent |

---

## 4. Automatic Invoice Application Logic

### 4.1 When Invoices Are Created

The system automatically applies advance rent when:

1. **Manual Invoice Creation** (`RentInvoiceController::store`)
   - After creating invoice, calls `AdvanceRentService::applyAdvanceRentToInvoice()`

2. **Bulk Invoice Generation** (`RentInvoiceController::bulkStore`)
   - Applies advance rent to each invoice after creation

3. **Auto Invoice Generation** (`AutoInvoiceService`)
   - When auto-invoices are generated, advance rent is automatically applied

### 4.2 Coverage Period Calculation

**Coverage Period:**
- **Start:** `lease_start` date
- **End:** `lease_start + advance_rent_months - 1 day`

**Example:**
- Lease starts: January 1, 2025
- Advance rent: 3 months
- Coverage: January 1, 2025 to March 31, 2025

### 4.3 Application Rules

1. **Invoice Date Check:** Invoice date must fall within coverage period
2. **Remaining Balance:** Only remaining advance rent can be applied
3. **Amount Calculation:** 
   - Invoice amount = `rent_amount + late_fee`
   - Applied amount = `min(invoice_amount, remaining_advance_rent)`
4. **Status Update:** If fully covered, invoice status → "paid"

---

## 5. Frontend Implementation

### 5.1 Collect Advance Rent Page

**Location:** `frontend/app/(dashboard)/advance-rent/collect/page.jsx`

**Features:**
- Tenant unit selection dropdown
- Auto-calculation: Amount = Monthly Rent × Months
- Payment method selection
- Transaction date picker
- Reference number and notes fields
- Shows existing advance rent if any
- Warning if replacing existing advance rent

### 5.2 Advance Rent Overview Page

**Location:** `frontend/app/(dashboard)/advance-rent/page.jsx`

**Features:**
- Lists all tenant units with advance rent
- Shows: Total amount, Used amount, Remaining amount
- Displays coverage period
- Quick link to collect more advance rent

---

## 6. Mobile API Limitations

### 6.1 Current Mobile Payment API

**Endpoint:** `POST /api/v1/mobile/payments`

**Capabilities:**
- ✅ Tenants can pay for **existing invoices**
- ✅ System considers advance rent when calculating amount due
- ❌ **Tenants CANNOT pay advance rent directly**

**Mobile Payment Flow:**
1. Tenant selects an invoice
2. System calculates: `amount_due = rent_amount + late_fee - advance_rent_applied`
3. Tenant pays the remaining amount
4. Invoice status updates accordingly

### 6.2 Why Tenants Can't Pay Advance Rent

The mobile API (`MobilePaymentController`) is designed for:
- Paying existing invoices
- Recording payments against invoices

Advance rent collection requires:
- Selecting a tenant unit (not an invoice)
- Specifying number of months
- Creating a financial record
- Updating tenant unit tracking

**This functionality is only available through the landlord web dashboard.**

---

## 7. Service Layer

### 7.1 AdvanceRentService

**Location:** `backend/app/Services/AdvanceRentService.php`

**Key Methods:**

1. **`collectAdvanceRent()`**
   - Records advance rent collection
   - Creates financial record
   - Updates tenant unit

2. **`applyAdvanceRentToInvoice()`**
   - Applies advance rent to a single invoice
   - Updates invoice status if fully covered
   - Tracks usage in tenant unit

3. **`retroactivelyApplyAdvanceRent()`**
   - Applies advance rent to existing invoices
   - Processes invoices chronologically
   - Returns detailed results

4. **`checkAdvanceRentCoverage()`**
   - Checks if invoice date is covered
   - Returns remaining amount and months

---

## 8. How to Enable Tenant Advance Rent Payment

If you want to allow tenants to pay advance rent through the mobile API, you would need to:

### 8.1 Create New Mobile Endpoint

**New Route:**
```php
Route::post('mobile/advance-rent', [MobileAdvanceRentController::class, 'store'])
    ->name('api.v1.mobile.advance-rent.store');
```

### 8.2 New Controller Method

**Required Logic:**
1. Authenticate tenant (different from landlord auth)
2. Find tenant's active tenant_unit
3. Accept: months, amount, payment_method, reference_number
4. Call `AdvanceRentService::collectAdvanceRent()`
5. Return success response

### 8.3 Considerations

- **Authorization:** Need tenant authentication system
- **Validation:** Ensure tenant can only pay for their own lease
- **Payment Processing:** May need integration with payment gateway
- **Notification:** Notify landlord when tenant pays advance rent

---

## 9. Key Files Reference

### Backend
- `backend/app/Services/AdvanceRentService.php` - Core service logic
- `backend/app/Http/Controllers/Api/V1/TenantUnitController.php` - API endpoints
- `backend/app/Http/Requests/StoreAdvanceRentRequest.php` - Validation
- `backend/app/Models/TenantUnit.php` - Model with advance rent methods
- `backend/app/Models/RentInvoice.php` - Invoice model
- `backend/database/migrations/2025_12_20_000000_add_advance_rent_tracking_fields.php` - Schema

### Frontend
- `frontend/app/(dashboard)/advance-rent/collect/page.jsx` - Collection form
- `frontend/app/(dashboard)/advance-rent/page.jsx` - Overview page
- `frontend/app/(dashboard)/tenant-units/page.jsx` - Shows advance rent info

### Mobile API
- `backend/app/Http/Controllers/Api/V1/Mobile/MobilePaymentController.php` - Mobile payments (invoices only)

---

## 10. Summary

### Current State
✅ **Landlords can collect advance rent** through web dashboard  
✅ **System automatically applies advance rent** to invoices  
✅ **Retroactive application** available for existing invoices  
✅ **Mobile API exists** for invoice payments (considers advance rent)  
❌ **Tenants cannot pay advance rent** through mobile API  

### Workflow
1. Landlord collects advance rent → Records in system
2. System creates invoices → Automatically applies advance rent
3. Invoices within coverage period → Marked as paid
4. System tracks usage → Shows remaining balance

### Recommendations
1. **If tenant self-service is needed:** Implement mobile advance rent payment endpoint
2. **If current flow is sufficient:** Document the landlord collection process clearly
3. **Consider:** Adding notifications when advance rent is collected or depleted

---

**Report Generated:** Based on codebase analysis  
**Last Updated:** Current codebase state

