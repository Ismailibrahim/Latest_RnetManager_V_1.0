# Auto-Generated Number System

This document describes the centralized number generation system for invoices, receipts, and refunds in the RentApplication.

## Overview

All invoice numbers, receipt numbers, and refund numbers are now **auto-generated** using a centralized `NumberGeneratorService`. Numbers are generated automatically when records are created, ensuring uniqueness and consistency.

## Number Format

All numbers follow the format: **`PREFIX-YYYYMM-SSS`**

Where:
- **PREFIX**: Type-specific prefix (e.g., RINV, MINV, SDR)
- **YYYYMM**: Year and month (e.g., 202401 for January 2024)
- **SSS**: Sequential number (001, 002, 003, etc.)

**Example:** `RINV-202401-001` (First rent invoice in January 2024)

## Prefixes

| Type | Prefix | Example | Table |
|------|--------|---------|-------|
| Rent Invoice | `RINV` | `RINV-202401-001` | `rent_invoices` |
| Maintenance Invoice | `MINV` | `MINV-202401-001` | `maintenance_invoices` |
| Financial Record Invoice | `FINV` | `FINV-202401-001` | `financial_records` |
| Maintenance Request Invoice | `MREQ` | `MREQ-202401-001` | `maintenance_requests` |
| Subscription Invoice | `SINV` | `SINV-202401-001` | `subscription_invoices` |
| Security Deposit Refund | `SDR` | `SDR-202401-001` | `security_deposit_refunds` |
| Receipt | `RCPT` | `RCPT-202401-001` | `security_deposit_refunds` |

## Auto-Generation Rules

### 1. Rent Invoices
- **Field:** `invoice_number`
- **Auto-generated:** ✅ Yes (if not provided)
- **When:** On model creation
- **Required:** Yes (auto-generated if missing)

### 2. Maintenance Invoices
- **Field:** `invoice_number`
- **Auto-generated:** ✅ Yes (if not provided)
- **When:** On model creation
- **Required:** Yes (auto-generated if missing)

### 3. Financial Records
- **Field:** `invoice_number`
- **Auto-generated:** ✅ Yes (for `fee` and `expense` types only)
- **When:** On model creation
- **Required:** No (optional field)

### 4. Maintenance Requests
- **Field:** `invoice_number`
- **Auto-generated:** ❌ No (manual only)
- **When:** N/A
- **Required:** No (optional field)

### 5. Subscription Invoices
- **Field:** `invoice_number`
- **Auto-generated:** ✅ Yes (if not provided)
- **When:** On model creation
- **Required:** Yes (auto-generated if missing)

### 6. Security Deposit Refunds
- **Field:** `refund_number`
- **Auto-generated:** ✅ Yes (if not provided)
- **When:** On model creation
- **Required:** Yes (auto-generated if missing)

### 7. Receipt Numbers
- **Field:** `receipt_number`
- **Auto-generated:** ✅ Yes (when `receipt_generated` is set to `true`)
- **When:** On model update (when receipt is generated)
- **Required:** No (only generated when receipt is created)

## Implementation

### Service Class

**Location:** `backend/app/Services/NumberGeneratorService.php`

The service provides methods for generating each type of number:

```php
use App\Services\NumberGeneratorService;

$service = app(NumberGeneratorService::class);

// Generate rent invoice number
$number = $service->generateRentInvoiceNumber($landlordId);
// Returns: "RINV-202401-001"

// Generate maintenance invoice number
$number = $service->generateMaintenanceInvoiceNumber($landlordId);
// Returns: "MINV-202401-001"

// Generate refund number
$number = $service->generateSecurityDepositRefundNumber($landlordId);
// Returns: "SDR-202401-001"

// Generate receipt number
$number = $service->generateReceiptNumber($landlordId);
// Returns: "RCPT-202401-001"
```

### Model Integration

Numbers are auto-generated using Laravel model events:

```php
// In RentInvoice model
protected static function boot(): void
{
    parent::boot();

    static::creating(function (RentInvoice $invoice) {
        if (empty($invoice->invoice_number) && $invoice->landlord_id) {
            $invoice->invoice_number = app(NumberGeneratorService::class)
                ->generateRentInvoiceNumber($invoice->landlord_id);
        }
    });
}
```

## Sequence Management

### Monthly Reset
- Sequence numbers reset each month
- Format includes year and month: `PREFIX-YYYYMM-SSS`
- Each month starts from `001`

### Uniqueness
- Numbers are unique per landlord
- Service checks existing numbers before generating
- Handles race conditions with database queries

### Example Sequence

```
January 2024:
- RINV-202401-001
- RINV-202401-002
- RINV-202401-003

February 2024:
- RINV-202402-001
- RINV-202402-002
```

## API Usage

### Creating Records

**Before (Manual):**
```json
POST /api/v1/rent-invoices
{
  "invoice_number": "INV-001",
  "tenant_unit_id": 1,
  "invoice_date": "2024-01-01",
  ...
}
```

**After (Auto-generated):**
```json
POST /api/v1/rent-invoices
{
  // invoice_number is optional - will be auto-generated
  "tenant_unit_id": 1,
  "invoice_date": "2024-01-01",
  ...
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "invoice_number": "RINV-202401-001",  // Auto-generated
    "tenant_unit_id": 1,
    ...
  }
}
```

### Manual Override

You can still provide a custom number if needed:

```json
POST /api/v1/rent-invoices
{
  "invoice_number": "CUSTOM-001",  // Custom number
  "tenant_unit_id": 1,
  ...
}
```

**Note:** Custom numbers must still be unique per landlord.

## Validation

### Store Requests
- `invoice_number` is now **nullable** (optional)
- If provided, must be unique per landlord
- If not provided, will be auto-generated

### Update Requests
- `invoice_number` is **nullable** (optional)
- Can be updated if needed
- Must be unique per landlord

## Frontend Changes

### Forms
Invoice number fields in forms are now **optional**:

```jsx
// Before
<Input
  name="invoice_number"
  required  // ❌ Remove required
  ...
/>

// After
<Input
  name="invoice_number"
  // Optional - will be auto-generated
  placeholder="Auto-generated if left empty"
  ...
/>
```

### Display
Always show the generated number after creation:

```jsx
{invoice.invoice_number && (
  <span>Invoice: {invoice.invoice_number}</span>
)}
```

## Receipt Number Generation

Receipt numbers are generated when a receipt is created:

```php
// In SecurityDepositRefund model
static::updating(function (SecurityDepositRefund $refund) {
    if ($refund->receipt_generated && empty($refund->receipt_number)) {
        $refund->receipt_number = app(NumberGeneratorService::class)
            ->generateReceiptNumber($refund->landlord_id);
    }
});
```

**Usage:**
```php
$refund->receipt_generated = true;
$refund->save(); // receipt_number will be auto-generated
```

## Customization

### Changing Prefixes

Edit `NumberGeneratorService::PREFIXES`:

```php
private const PREFIXES = [
    'rent_invoice' => 'RINV',  // Change to your preferred prefix
    'maintenance_invoice' => 'MINV',
    // ...
];
```

### Changing Format

Modify the `generateNumber()` method in `NumberGeneratorService`:

```php
// Current format: PREFIX-YYYYMM-SSS
$number = sprintf('%s-%s-%03d', $prefix, $year . $month, $sequence);

// Custom format example: PREFIX-YYYY-SSS
$number = sprintf('%s-%s-%03d', $prefix, $year, $sequence);
```

## Testing

### Unit Tests

Test number generation:

```php
use App\Services\NumberGeneratorService;

$service = new NumberGeneratorService();
$number = $service->generateRentInvoiceNumber(1);

$this->assertStringStartsWith('RINV-', $number);
$this->assertMatchesRegularExpression('/^RINV-\d{6}-\d{3}$/', $number);
```

### Integration Tests

Test auto-generation in model creation:

```php
$invoice = RentInvoice::factory()->create([
    'landlord_id' => $landlord->id,
    'invoice_number' => null, // Will be auto-generated
]);

$this->assertNotNull($invoice->invoice_number);
$this->assertStringStartsWith('RINV-', $invoice->invoice_number);
```

## Migration Notes

### Existing Data
- Existing records with numbers will remain unchanged
- New records will use auto-generation
- Old number formats can coexist with new formats

### Backward Compatibility
- API still accepts `invoice_number` in requests (optional)
- Manual numbers are still validated for uniqueness
- No breaking changes to existing functionality

## Benefits

1. **Consistency** - All numbers follow the same format
2. **Uniqueness** - Guaranteed unique numbers per landlord
3. **Simplicity** - No need to manually generate numbers
4. **Traceability** - Year/month in number helps with organization
5. **Scalability** - Monthly reset prevents sequence overflow

## Troubleshooting

### Duplicate Numbers
- Should not occur due to uniqueness checks
- If it happens, check for race conditions in concurrent requests
- Consider adding database-level unique constraints

### Missing Numbers
- Check that `landlord_id` is set before creation
- Verify model boot methods are called
- Check service is registered in service container

### Custom Format Needed
- Override `generateNumber()` method
- Or create custom generator methods
- Update model boot methods to use custom generator

---

**Last Updated:** 2024-01-01  
**Service:** `App\Services\NumberGeneratorService`

