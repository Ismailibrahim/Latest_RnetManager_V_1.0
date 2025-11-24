# Invoice and Receipt Number System Review

This document provides a comprehensive overview of all invoice numbers, receipt numbers, and related numbering systems used in the RentApplication system.

## Summary

**Total Invoice Number Fields: 5**
**Total Receipt Number Fields: 1**
**Total Refund Number Fields: 1**

---

## Invoice Numbers

### 1. Rent Invoice Number
**Table:** `rent_invoices`  
**Field:** `invoice_number`  
**Type:** VARCHAR(100)  
**Constraints:** 
- ✅ **REQUIRED** (NOT NULL)
- ✅ **UNIQUE** (per table)
- ✅ Indexed (`idx_invoices_number`)

**Model:** `App\Models\RentInvoice`  
**Usage:** Unique identifier for rent invoices issued to tenants  
**Example Format:** `INV-001`, `INV-2024-001`  
**Validation:** Must be unique per landlord (enforced in validation rules)

**Related Files:**
- `backend/app/Models/RentInvoice.php`
- `backend/app/Http/Controllers/Api/V1/RentInvoiceController.php`
- `backend/app/Http/Resources/RentInvoiceResource.php`
- `frontend/app/(dashboard)/rent-invoices/page.jsx`

---

### 2. Maintenance Invoice Number
**Table:** `maintenance_invoices`  
**Field:** `invoice_number`  
**Type:** VARCHAR(120)  
**Constraints:**
- ✅ **REQUIRED** (NOT NULL)
- ✅ **UNIQUE** (per table)
- ✅ Indexed

**Model:** `App\Models\MaintenanceInvoice`  
**Usage:** Unique identifier for maintenance invoices issued for repair/maintenance work  
**Example Format:** `MAINT-001`, `MAINT-2024-001`  
**Validation:** Must be unique per landlord (enforced in validation rules)

**Related Files:**
- `backend/app/Models/MaintenanceInvoice.php`
- `backend/app/Http/Controllers/Api/V1/MaintenanceInvoiceController.php`
- `backend/app/Http/Resources/MaintenanceInvoiceResource.php`
- `frontend/app/(dashboard)/maintenance-invoices/page.jsx`

---

### 3. Financial Record Invoice Number
**Table:** `financial_records`  
**Field:** `invoice_number`  
**Type:** VARCHAR(100)  
**Constraints:**
- ⚠️ **OPTIONAL** (NULLABLE)
- ❌ Not unique (can have duplicates)
- ✅ Indexed (`idx_financial_invoice`)

**Model:** `App\Models\FinancialRecord`  
**Usage:** Optional reference to an invoice number for financial records  
**Example Format:** `INV-001`, `SUB-202401`  
**Validation:** Optional field, can be null. If provided, should be unique per landlord (enforced in validation rules)

**Related Files:**
- `backend/app/Models/FinancialRecord.php`
- `backend/app/Http/Controllers/Api/V1/FinancialRecordController.php`
- `backend/app/Http/Resources/FinancialRecordResource.php`

**Note:** This field is used to link financial records to external invoices or subscription invoices.

---

### 4. Maintenance Request Invoice Number
**Table:** `maintenance_requests`  
**Field:** `invoice_number`  
**Type:** VARCHAR(100)  
**Constraints:**
- ⚠️ **OPTIONAL** (NULLABLE)
- ❌ Not unique
- ❌ Not indexed

**Model:** `App\Models\MaintenanceRequest`  
**Usage:** Optional reference to an invoice number for maintenance requests  
**Example Format:** `MR-001`, `MAINT-REQ-001`  
**Validation:** Optional field, can be null

**Related Files:**
- `backend/app/Models/MaintenanceRequest.php`
- `backend/app/Http/Controllers/Api/V1/MaintenanceRequestController.php`
- `backend/app/Http/Resources/MaintenanceRequestResource.php`

**Note:** This field is typically populated when a maintenance request is converted to a maintenance invoice.

---

### 5. Subscription Invoice Number
**Table:** `subscription_invoices`  
**Field:** `invoice_number`  
**Type:** VARCHAR(255)  
**Constraints:**
- ✅ **REQUIRED** (NOT NULL)
- ✅ **UNIQUE** (per table)
- ❌ Not indexed

**Model:** `App\Models\SubscriptionInvoice`  
**Usage:** Unique identifier for subscription/billing invoices issued to landlords  
**Example Format:** `SUB-202401`, `BILL-001`  
**Validation:** Must be unique

**Related Files:**
- `backend/app/Models/SubscriptionInvoice.php`
- `backend/app/Http/Controllers/Api/V1/BillingSettingsController.php`
- `backend/app/Http/Resources/SubscriptionInvoiceResource.php`
- `frontend/app/(dashboard)/settings/billing/page.jsx`

**Note:** This is for billing landlords for their subscription to the platform.

---

## Receipt Numbers

### 1. Security Deposit Refund Receipt Number
**Table:** `security_deposit_refunds`  
**Field:** `receipt_number`  
**Type:** VARCHAR(100)  
**Constraints:**
- ⚠️ **OPTIONAL** (NULLABLE)
- ❌ Not unique
- ❌ Not indexed

**Model:** `App\Models\SecurityDepositRefund`  
**Usage:** Receipt number generated when a security deposit refund receipt is created  
**Example Format:** `RCPT-001`, `RCPT-2024-001`  
**Validation:** Optional field, can be null

**Related Files:**
- `backend/app/Models/SecurityDepositRefund.php`
- `backend/app/Http/Controllers/Api/V1/SecurityDepositRefundController.php`
- `backend/app/Http/Resources/SecurityDepositRefundResource.php`
- `frontend/app/(dashboard)/security-deposit-refunds/page.jsx`

**Note:** This field is populated when `receipt_generated` is set to `true`.

---

## Refund Numbers

### 1. Security Deposit Refund Number
**Table:** `security_deposit_refunds`  
**Field:** `refund_number`  
**Type:** VARCHAR(100)  
**Constraints:**
- ✅ **REQUIRED** (NOT NULL)
- ✅ **UNIQUE** (per table)
- ✅ Indexed (`idx_deposit_refund_number`)

**Model:** `App\Models\SecurityDepositRefund`  
**Usage:** Unique identifier for security deposit refund records  
**Example Format:** `REF-001`, `REF-2024-001`  
**Validation:** Must be unique per landlord (enforced in validation rules)

**Related Files:**
- `backend/app/Models/SecurityDepositRefund.php`
- `backend/app/Http/Controllers/Api/V1/SecurityDepositRefundController.php`
- `backend/app/Http/Resources/SecurityDepositRefundResource.php`
- `frontend/app/(dashboard)/security-deposit-refunds/page.jsx`

**Note:** This is different from `receipt_number`. The refund number identifies the refund record, while the receipt number is for the generated receipt document.

---

## Unified Payments View

The `unified_payments` view consolidates invoice numbers from different sources:

```sql
-- From financial_records
fr.invoice_number

-- From rent_invoices (mapped as invoice_number)
ri.invoice_number

-- From security_deposit_refunds (mapped as invoice_number)
sdr.receipt_number AS invoice_number
```

**Note:** In the unified payments view, `receipt_number` from security deposit refunds is mapped to `invoice_number` for consistency.

---

## Numbering Patterns

Based on factory files and examples:

1. **Rent Invoices:** `INV-#####` (e.g., `INV-12345`)
2. **Maintenance Invoices:** `MAINT-#####` (e.g., `MAINT-001`)
3. **Financial Records:** `INV-####` (optional, e.g., `INV-1234`)
4. **Maintenance Requests:** `MR-#####` (optional, e.g., `MR-00123`)
5. **Subscription Invoices:** `SUB-YYYYMM` or `XXX-#####` (e.g., `SUB-202401`, `ABC-12345`)
6. **Security Deposit Refunds:** `REF-#####` (e.g., `REF-001`)
7. **Receipt Numbers:** `RCPT-#####` (e.g., `RCPT-001`)

---

## Validation Rules Summary

| Field | Table | Required | Unique | Indexed | Per Landlord Unique |
|-------|-------|----------|--------|---------|---------------------|
| `invoice_number` | `rent_invoices` | ✅ | ✅ | ✅ | ✅ |
| `invoice_number` | `maintenance_invoices` | ✅ | ✅ | ✅ | ✅ |
| `invoice_number` | `financial_records` | ❌ | ❌ | ✅ | ✅ (if provided) |
| `invoice_number` | `maintenance_requests` | ❌ | ❌ | ❌ | ❌ |
| `invoice_number` | `subscription_invoices` | ✅ | ✅ | ❌ | ❌ |
| `receipt_number` | `security_deposit_refunds` | ❌ | ❌ | ❌ | ❌ |
| `refund_number` | `security_deposit_refunds` | ✅ | ✅ | ✅ | ✅ |

---

## Recommendations

### 1. Consistency
- Consider standardizing invoice number formats across all invoice types
- Implement a centralized invoice number generation service

### 2. Uniqueness
- `maintenance_requests.invoice_number` and `financial_records.invoice_number` are not unique
- Consider adding uniqueness constraints if these should be unique

### 3. Indexing
- `subscription_invoices.invoice_number` is unique but not indexed - consider adding an index
- `maintenance_requests.invoice_number` is not indexed - consider if needed for queries

### 4. Receipt Number
- `receipt_number` in `security_deposit_refunds` is optional and not unique
- Consider making it unique if receipts should have unique numbers
- Consider adding an index if frequently queried

### 5. Documentation
- Document the numbering format/pattern for each type
- Consider implementing auto-generation for invoice numbers

---

## Related Documentation

- API Documentation: `docs/API_DOCUMENTATION.md`
- Database Schema: `database-schema.sql`
- Models: `backend/app/Models/`

---

## Auto-Generation

**Status:** ✅ **IMPLEMENTED**

All invoice numbers, receipt numbers, and refund numbers are now **auto-generated** using the centralized `NumberGeneratorService`.

**See:** [`docs/NUMBER_GENERATION.md`](NUMBER_GENERATION.md) for complete documentation on the auto-generation system.

### Quick Summary

- **Format:** `PREFIX-YYYYMM-SSS` (e.g., `RINV-202401-001`)
- **Auto-generated:** Yes (if not provided)
- **Prefixes:** RINV, MINV, FINV, MREQ, SINV, SDR, RCPT
- **Service:** `App\Services\NumberGeneratorService`

---

**Last Updated:** 2024-01-01  
**Review Status:** Complete  
**Auto-Generation:** ✅ Implemented

