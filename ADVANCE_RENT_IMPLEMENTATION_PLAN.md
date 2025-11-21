# Advance Rent Implementation Plan

## Overview
This document outlines the implementation plan for separating advance rent collection from lease creation and integrating it with rent invoice generation.

---

## Phase 1: Database & Model Updates

### 1.1 Keep Current Schema
- ✅ `tenant_units` table already has:
  - `advance_rent_months` (integer, default 0)
  - `advance_rent_amount` (decimal(10,2), default 0.00)
- Add tracking fields (optional enhancement):
  - `advance_rent_used` (decimal(10,2), default 0.00) - tracks how much advance rent has been applied
  - `advance_rent_collected_date` (date, nullable) - when advance rent was collected

### 1.2 Add RentInvoice Fields (Migration Needed)
Add to `rent_invoices` table:
- `advance_rent_applied` (decimal(10,2), default 0.00) - amount of advance rent applied to this invoice
- `is_advance_covered` (boolean, default false) - whether this invoice is fully covered by advance rent

---

## Phase 2: Backend API - Advance Rent Collection

### 2.1 Create Advance Rent Collection Endpoint
**New Controller**: `backend/app/Http/Controllers/Api/V1/AdvanceRentController.php`

**Endpoints**:
- `POST /api/v1/tenant-units/{tenantUnit}/advance-rent` - Collect advance rent
- `GET /api/v1/tenant-units/{tenantUnit}/advance-rent` - Get advance rent details

**Request**: `StoreAdvanceRentRequest.php`
```php
Rules:
- advance_rent_months: required, integer, min:1, max:12
- advance_rent_amount: required, numeric, min:0
- payment_method: nullable, exists:payment_methods
- transaction_date: required, date
- reference_number: nullable, string, max:100
- notes: nullable, string, max:500
```

**Actions**:
1. Validate tenant unit belongs to landlord
2. Calculate amount from months if not provided (monthly_rent × months)
3. Update `tenant_units.advance_rent_months` and `advance_rent_amount`
4. Set `advance_rent_collected_date` to transaction_date
5. **Create Financial Record** with:
   - type: 'rent'
   - category: 'monthly_rent' (or 'advance_rent' if new category)
   - amount: advance_rent_amount
   - status: 'completed'
   - transaction_date: provided date
6. Return updated tenant unit resource

---

## Phase 3: Update Rent Invoice Generation

### 3.1 Modify RentInvoiceController@store

**Logic Flow**:
```php
1. When creating invoice, check tenant_unit for advance_rent_months and advance_rent_amount
2. Determine if invoice date falls within advance rent period:
   - Calculate months since lease_start
   - If within advance_rent_months period:
     a. Calculate remaining advance rent: advance_rent_amount - advance_rent_used
     b. If remaining >= invoice amount:
        - Set invoice status to 'paid'
        - Set paid_date to invoice_date
        - Set advance_rent_applied = invoice amount
        - Update tenant_unit.advance_rent_used += invoice amount
     c. If remaining < invoice amount:
        - Set advance_rent_applied = remaining
        - Set invoice.rent_amount = invoice.rent_amount - remaining
        - Update advance_rent_used += remaining
        - Invoice status remains 'generated' (partial coverage)
3. Save invoice with advance_rent_applied field
```

### 3.2 Service Class: AdvanceRentService
**Create**: `backend/app/Services/AdvanceRentService.php`

**Methods**:
- `checkAdvanceRentCoverage(TenantUnit $tenantUnit, Carbon $invoiceDate): array`
  - Returns: ['covered' => bool, 'remaining' => float, 'months_remaining' => int]
- `applyAdvanceRentToInvoice(RentInvoice $invoice, TenantUnit $tenantUnit): RentInvoice`
  - Applies advance rent and updates tenant_unit tracking
- `calculateAdvanceRentPeriod(TenantUnit $tenantUnit): array`
  - Returns covered date range

---

## Phase 4: Frontend - Separate Advance Rent Collection Page

### 4.1 Remove Advance Rent Fields from `/tenant-units/new`
**File**: `frontend/app/(dashboard)/tenant-units/new/page.jsx`

**Changes**:
- Remove `advanceRentMonths` and `advanceRentAmount` from `initialFormState`
- Remove advance rent form fields (lines 827-877)
- Remove advance rent calculation useEffect (lines 411-455)
- Remove advance rent from `buildFormData` function

### 4.2 Create Advance Rent Collection Page
**New File**: `frontend/app/(dashboard)/advance-rent/collect/page.jsx`

**Features**:
- Select tenant unit (dropdown with search)
- Show current lease details:
  - Monthly rent
  - Lease start/end dates
  - Current advance rent status (if any)
- Form fields:
  - Advance rent months (1-12)
  - Advance rent amount (auto-calculated, editable)
  - Payment method
  - Transaction date
  - Reference number (optional)
  - Notes (optional)
- Display total calculation: `monthly_rent × months = amount`
- Submit creates financial record and updates tenant unit

### 4.3 Create Advance Rent List/View Page
**New File**: `frontend/app/(dashboard)/advance-rent/page.jsx`

**Features**:
- List all tenant units with advance rent
- Show:
  - Tenant & Unit info
  - Advance rent collected
  - Advance rent used
  - Advance rent remaining
  - Covered period
  - Status badge (Fully Used / Partially Used / Available)

---

## Phase 5: Update Invoice Generation UI

### 5.1 Update Rent Invoice Creation Form
**File**: `frontend/app/(dashboard)/rent-invoices/page.jsx`

**Changes**:
- When tenant unit is selected, check for advance rent
- Show indicator if invoice will be covered by advance rent
- Display advance rent info:
  - "This invoice will be automatically paid from advance rent"
  - Show remaining advance rent amount
  - Show covered months indicator

### 5.2 Update Invoice Display
**File**: `frontend/app/(dashboard)/rent-invoices/page.jsx` (invoice list)

**Changes**:
- Add badge/indicator for invoices paid with advance rent
- Show `advance_rent_applied` amount in invoice details
- Display message: "Paid using advance rent: MVR X.XX"

---

## Phase 6: Invoice PDF Template Update

### 6.1 Update PDF Template
**File**: `backend/resources/views/pdf/rent_invoice.blade.php`

**Changes**:
- Add section showing advance rent applied (if any)
- Modify invoice line items:
  ```
  Monthly rent: MVR X,XXX.XX
  - Advance rent applied: MVR XXX.XX
  = Amount due: MVR X,XXX.XX
  ```
- If fully paid by advance rent:
  - Show badge: "Paid with Advance Rent"
  - Show "No payment required - covered by advance rent"
- Add footer note about advance rent coverage period

---

## Phase 7: UI Indicators & Display Updates

### 7.1 Tenant Unit Detail Page
**File**: `frontend/app/(dashboard)/tenant-units/page.jsx`

**Add Section**:
- Advance Rent Status card:
  - Total collected
  - Amount used
  - Amount remaining
  - Covered months (e.g., "Covers months 1-3")
  - Visual progress bar
  - Link to collect more advance rent

### 7.2 Tenant Detail Page
**File**: `frontend/app/(dashboard)/tenants/[id]/page.jsx`

**Update**:
- Show advance rent info per lease
- Indicate which months are covered

### 7.3 Invoice List Enhancements
- Add filter: "Show only advance-paid invoices"
- Color code: Green for fully advance-paid, Yellow for partially paid
- Icon indicator for advance rent coverage

---

## Phase 8: API Resources & Response Updates

### 8.1 Update TenantUnitResource
**File**: `backend/app/Http/Resources/TenantUnitResource.php`

**Add Fields**:
- `advance_rent_used` (calculated or stored)
- `advance_rent_remaining` (calculated)
- `advance_rent_collected_date`
- `advance_rent_covered_period` (e.g., "2024-01 to 2024-03")
- Helper methods for checking coverage

### 8.2 Update RentInvoiceResource
**File**: `backend/app/Http/Resources/RentInvoiceResource.php`

**Add Fields**:
- `advance_rent_applied`
- `is_advance_covered`
- `is_partially_covered` (computed)

---

## Implementation Order & Priority

### Priority 1 (Core Functionality):
1. ✅ Remove advance rent from `/tenant-units/new` page
2. ✅ Create advance rent collection API endpoint
3. ✅ Create advance rent collection page (frontend)
4. ✅ Update invoice generation to apply advance rent
5. ✅ Create financial record when collecting advance rent

### Priority 2 (Enhanced Features):
6. ✅ Update invoice PDF template
7. ✅ Add UI indicators on invoice list
8. ✅ Update tenant unit detail page with advance rent status
9. ✅ Create advance rent list/view page

### Priority 3 (Polish):
10. ✅ Add filters and search
11. ✅ Add advance rent reports
12. ✅ Add validation warnings (e.g., "Invoice date outside advance period")

---

## Key Considerations

### Data Integrity:
- Track `advance_rent_used` to prevent over-applying
- Validate invoice dates fall within lease period
- Ensure advance rent can't exceed total lease value

### Edge Cases:
- What if advance rent is collected after invoices are generated?
  - Solution: Allow retroactive application via invoice update
- What if tenant unit is updated/changed?
  - Solution: Recalculate coverage when monthly_rent changes
- What if lease ends before advance rent is fully used?
  - Solution: Refund remaining advance rent or mark for refund

### User Experience:
- Clear messaging about advance rent coverage
- Visual indicators throughout the app
- Helpful tooltips explaining advance rent logic
- Confirmation dialogs when applying large advance amounts

---

## Testing Checklist

- [ ] Collect advance rent creates financial record
- [ ] Invoice generated within advance period is auto-paid
- [ ] Invoice generated outside advance period is not auto-paid
- [ ] Partial advance rent is applied correctly
- [ ] Advance rent tracking (`advance_rent_used`) updates correctly
- [ ] Multiple invoices can be covered by single advance rent
- [ ] UI shows correct advance rent status
- [ ] PDF invoice shows advance rent information
- [ ] Validation prevents over-applying advance rent
- [ ] Advance rent collection page works correctly
- [ ] Removing advance rent fields from lease creation works

---

## Migration Strategy

1. **Data Migration**: If existing tenant units have advance rent:
   - Set `advance_rent_used = 0` for all existing records
   - Calculate and backfill if needed
   
2. **Existing Invoices**: 
   - Add `advance_rent_applied = 0` to all existing invoices
   - Optionally: Run script to retroactively apply advance rent to existing invoices

3. **Rollout**:
   - Deploy backend API first
   - Update frontend to remove advance rent from lease creation
   - Deploy new advance rent collection page
   - Update invoice generation logic
   - Add UI enhancements incrementally

