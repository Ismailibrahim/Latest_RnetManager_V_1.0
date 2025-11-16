# Rent Invoice System - Complete Guide

This document explains how the rent invoice system works in the RentApplication, including creation, workflow, payment processing, and integration with other systems.

## Overview

Rent invoices are documents issued to tenants for monthly rent payments. They track the billing cycle, payment status, and integrate with the unified payment collection system.

## Database Structure

### Rent Invoice Table

```sql
rent_invoices
├── id (Primary Key)
├── tenant_unit_id (Foreign Key → tenant_units)
├── landlord_id (Foreign Key → landlords)
├── invoice_number (Unique, Auto-generated: RINV-YYYYMM-SSS)
├── invoice_date (Date when invoice was created)
├── due_date (Date when payment is due)
├── rent_amount (Decimal 10,2 - Base rent amount)
├── late_fee (Decimal 10,2 - Late payment fee, default: 0)
├── status (Enum: 'generated', 'sent', 'paid', 'overdue', 'cancelled')
├── paid_date (Date - When payment was received, nullable)
├── payment_method (Enum: 'cash', 'bank_transfer', 'upi', 'card', 'cheque', nullable)
└── timestamps (created_at, updated_at)
```

## Invoice Number Auto-Generation

**Format:** `RINV-YYYYMM-SSS`

- **RINV** - Prefix for Rent Invoice
- **YYYYMM** - Year and month (e.g., 202401 for January 2024)
- **SSS** - Sequential number (001, 002, 003...)

**Example:** `RINV-202401-001` (First rent invoice in January 2024)

**Auto-generation:** Invoice numbers are automatically generated when creating a rent invoice if not provided.

## Status Workflow

```
┌─────────────┐
│  generated  │ ← Invoice created (default status)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    sent     │ ← Invoice sent to tenant
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│    paid     │   │   overdue   │ ← Past due date, not paid
└─────────────┘   └─────────────┘
       │
       │
       ▼
┌─────────────┐
│ cancelled  │ ← Invoice cancelled (optional)
└─────────────┘
```

### Status Descriptions

1. **`generated`** (Default)
   - Invoice has been created
   - Not yet sent to tenant
   - Appears in pending charges

2. **`sent`**
   - Invoice has been sent to tenant
   - Waiting for payment
   - Appears in pending charges

3. **`paid`**
   - Payment has been received
   - `paid_date` and `payment_method` are set
   - Does NOT appear in pending charges
   - Automatically updated when payment is collected

4. **`overdue`**
   - Past due date, not yet paid
   - Appears in pending charges
   - Can be manually set or auto-updated

5. **`cancelled`**
   - Invoice has been cancelled
   - Does NOT appear in pending charges
   - Cannot be paid

## Creating a Rent Invoice

### Via API

**Endpoint:** `POST /api/v1/rent-invoices`

**Request Body:**
```json
{
  "tenant_unit_id": 1,
  "invoice_date": "2024-01-01",
  "due_date": "2024-01-07",
  "rent_amount": 10000.00,
  "late_fee": 500.00,
  "status": "generated",
  "invoice_number": null  // Optional - will be auto-generated
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "invoice_number": "RINV-202401-001",  // Auto-generated
    "tenant_unit_id": 1,
    "invoice_date": "2024-01-01",
    "due_date": "2024-01-07",
    "rent_amount": "10000.00",
    "late_fee": "500.00",
    "status": "generated",
    "paid_date": null,
    "payment_method": null
  }
}
```

### Via Frontend

1. Navigate to **Rent Invoices** page
2. Click **"Create Invoice"** button
3. Fill in the form:
   - **Tenant & Unit** (required)
   - **Invoice Date** (required)
   - **Due Date** (required, must be >= invoice date)
   - **Rent Amount** (required)
   - **Late Fee** (optional, default: 0)
   - **Invoice Number** (optional - auto-generated if left empty)
   - **Status** (optional, default: "generated")
4. Click **"Create Invoice"**

## Payment Collection Integration

### Pending Charges

Rent invoices with status `generated`, `sent`, or `overdue` appear in the **Payment Collection** page as pending charges.

**Endpoint:** `GET /api/v1/tenant-units/{tenantUnit}/pending-charges`

**Response includes rent invoices:**
```json
{
  "data": [
    {
      "id": "rent_invoice:1",
      "source_type": "rent_invoice",
      "source_id": 1,
      "title": "RINV-202401-001",
      "description": "Invoice RINV-202401-001",
      "status": "sent",
      "due_date": "2024-01-07",
      "amount": 10500.00,  // rent_amount + late_fee
      "currency": "AED",
      "suggested_payment_type": "rent",
      "supports_partial": true,
      "metadata": {
        "invoice_number": "RINV-202401-001",
        "rent_amount": 10000.00,
        "late_fee": 500.00
      }
    }
  ]
}
```

### Payment Processing

When a payment is collected through the **Unified Payment System**:

1. **Payment is created** via `POST /api/v1/unified-payments`
2. **UnifiedPaymentService** processes the payment
3. **If payment is for a rent invoice:**
   - Invoice status is updated to `paid`
   - `paid_date` is set to payment date
   - `payment_method` is set to payment method
   - Invoice **disappears** from pending charges

### Partial Payments

Rent invoices support **partial payments**:

- If payment amount < invoice total:
  - Invoice status remains `sent` or `overdue` (stays in pending charges)
  - Invoice can receive additional payments until fully paid
- If payment amount >= invoice total:
  - Invoice status changes to `paid`
  - Invoice removed from pending charges

## Updating Invoice Status

### Manual Update

**Endpoint:** `PATCH /api/v1/rent-invoices/{id}`

```json
{
  "status": "sent",
  "paid_date": "2024-01-05",
  "payment_method": "bank_transfer"
}
```

### Automatic Update (via Payment)

When payment is collected:
- Status → `paid`
- `paid_date` → Payment date
- `payment_method` → Payment method

**Code:** `UnifiedPaymentService::updateRentInvoiceStatus()`

## Invoice Export (PDF)

**Endpoint:** `GET /api/v1/rent-invoices/{id}/export`

Generates a PDF invoice with:
- Invoice number
- Tenant and unit information
- Invoice date and due date
- Rent amount and late fee
- Total amount
- Payment status

**Usage:**
- Click **"Download PDF"** button on invoice
- PDF is generated using mPDF library
- Filename: `{invoice_number}.pdf`

## Permissions

### Who Can Create/Update?

- **Owner** - Full access
- **Admin** - Full access
- **Manager** - No access (cannot create/update)
- **Agent** - No access

**Policy:** `RentInvoicePolicy`

## Relationships

### Tenant Unit
```php
$invoice->tenantUnit() // BelongsTo TenantUnit
```

### Landlord
```php
$invoice->landlord() // BelongsTo Landlord
```

### Through Tenant Unit
```php
$invoice->tenantUnit->tenant  // Tenant
$invoice->tenantUnit->unit    // Unit
$invoice->tenantUnit->unit->property  // Property
```

## Querying Invoices

### List All Invoices

**Endpoint:** `GET /api/v1/rent-invoices`

**Query Parameters:**
- `status` - Filter by status
- `tenant_unit_id` - Filter by tenant unit
- `per_page` - Pagination

**Example:**
```
GET /api/v1/rent-invoices?status=paid&per_page=20
```

### Get Single Invoice

**Endpoint:** `GET /api/v1/rent-invoices/{id}`

Returns invoice with tenant and unit information.

## Frontend Features

### Rent Invoices Page

**Location:** `/rent-invoices`

**Features:**
- ✅ List all invoices (table/card view)
- ✅ Filter by status
- ✅ Search by invoice number
- ✅ Create new invoice
- ✅ Edit invoice
- ✅ Delete invoice
- ✅ Preview invoice
- ✅ Download PDF
- ✅ Update status
- ✅ View payment details

### Form Fields

- **Tenant & Unit** - Dropdown selection
- **Invoice Number** - Auto-generated (optional manual entry)
- **Invoice Date** - Date picker
- **Due Date** - Date picker (must be >= invoice date)
- **Rent Amount** - Number input
- **Late Fee** - Number input (optional)
- **Status** - Dropdown (generated, sent, paid, overdue, cancelled)
- **Payment Method** - Dropdown (if paid)
- **Paid Date** - Date picker (if paid)

## Integration with Financial Records

When a rent invoice is paid:

1. **Unified Payment Entry** is created
2. **Financial Record** is automatically created (via `UnifiedPaymentService`)
   - Type: `rent`
   - Category: `monthly_rent`
   - Amount: Payment amount
   - Status: `completed` or `partial`
   - Links to the unified payment entry

This ensures:
- ✅ Rent invoices are tracked in the legacy financial records system
- ✅ Financial reports include rent payments
- ✅ Data consistency between new and legacy systems

## Best Practices

### 1. Invoice Creation
- Create invoices at the beginning of each billing cycle
- Set due date 5-7 days after invoice date
- Include late fees in the invoice if applicable

### 2. Status Management
- Mark as `sent` when invoice is delivered to tenant
- Mark as `overdue` when past due date
- Let the system auto-update to `paid` when payment is collected

### 3. Payment Collection
- Use the **Payment Collection** page to collect payments
- System automatically updates invoice status
- No manual status update needed after payment

### 4. Invoice Numbers
- Let the system auto-generate invoice numbers
- Use consistent format for easy tracking
- Monthly sequence reset helps with organization

## Common Workflows

### Monthly Rent Invoice Workflow

1. **Create Invoice** (1st of month)
   - Invoice date: 1st
   - Due date: 7th
   - Status: `generated`

2. **Send to Tenant** (1st-2nd)
   - Update status to `sent`
   - Invoice appears in pending charges

3. **Payment Collection** (7th or before)
   - Tenant pays via Payment Collection page
   - Invoice status auto-updates to `paid`
   - Invoice disappears from pending charges

4. **Late Payment** (After 7th)
   - Invoice status: `overdue`
   - Late fee may apply
   - Still appears in pending charges

### Partial Payment Workflow

1. **Invoice Created** - Amount: 10,000
2. **Partial Payment** - 5,000 received
   - Invoice status: `sent` (remains)
   - Remaining: 5,000
   - Still in pending charges
3. **Full Payment** - 5,000 received
   - Invoice status: `paid`
   - Removed from pending charges

## Troubleshooting

### Invoice Not Appearing in Pending Charges

**Check:**
- Status must be `generated`, `sent`, or `overdue`
- Invoice must belong to the selected tenant unit
- Invoice must belong to the current landlord

### Invoice Not Updating to Paid

**Check:**
- Payment must be linked to the invoice (source_type: `rent_invoice`)
- Payment amount must be >= invoice total (for full payment)
- `UnifiedPaymentService` must be called correctly

### Duplicate Invoice Numbers

**Should not happen** - Auto-generation ensures uniqueness per landlord.

If it does:
- Check `NumberGeneratorService` logic
- Verify database unique constraint
- Check for race conditions

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/rent-invoices` | List all invoices |
| POST | `/api/v1/rent-invoices` | Create invoice |
| GET | `/api/v1/rent-invoices/{id}` | Get single invoice |
| PATCH | `/api/v1/rent-invoices/{id}` | Update invoice |
| DELETE | `/api/v1/rent-invoices/{id}` | Delete invoice |
| GET | `/api/v1/rent-invoices/{id}/export` | Export PDF |

## Related Documentation

- **Number Generation:** [`docs/NUMBER_GENERATION.md`](NUMBER_GENERATION.md)
- **Invoice/Receipt Numbers:** [`docs/INVOICE_RECEIPT_NUMBERS.md`](INVOICE_RECEIPT_NUMBERS.md)
- **Unified Payments:** See unified payment system documentation
- **Payment Collection:** See payment collection page documentation

---

**Last Updated:** 2024-01-01  
**Model:** `App\Models\RentInvoice`  
**Controller:** `App\Http\Controllers\Api\V1\RentInvoiceController`

