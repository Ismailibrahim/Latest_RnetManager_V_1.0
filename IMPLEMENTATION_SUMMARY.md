# Configurable Invoice/Receipt Rendering System - Implementation Summary

## Overview
A universal configurable invoice/receipt rendering system has been implemented that supports all types of collections and payments in the application.

## Completed Components

### Backend

1. **Database Migration** (`2025_01_23_000000_create_document_templates_table.php`)
   - Creates `document_templates` table
   - Supports 9 document types
   - Stores HTML templates with placeholder support

2. **DocumentTemplate Model** (`app/Models/DocumentTemplate.php`)
   - Eloquent model with relationships
   - Helper methods: `getDefaultTemplate()`, `getTemplate()`
   - Scopes for filtering by type and landlord

3. **DocumentTemplateService** (`app/Services/DocumentTemplateService.php`)
   - `renderTemplate()`: Replaces `{{placeholder}}` syntax with data
   - `prepareDataForDocument()`: Aggregates data for all document types
   - Supports all 9 document types:
     - rent-invoice
     - maintenance-invoice
     - security-deposit-slip
     - advance-rent-receipt
     - fee-collection-receipt
     - security-deposit-refund
     - other-income-receipt
     - payment-voucher
     - unified-payment-entry

4. **PrintController** (`app/Http/Controllers/Api/V1/PrintController.php`)
   - `print()` method handles all document types
   - Supports HTML and PDF output formats
   - Authorization checks for landlord ownership
   - CORS headers included for mobile app compatibility

5. **API Route** (`routes/api.php`)
   - `GET /api/v1/print/{type}/{id}?format=html|pdf`
   - Type validation
   - Authentication required

6. **DocumentTemplateSeeder** (`database/seeders/DocumentTemplateSeeder.php`)
   - Creates default professional templates for all 9 document types
   - Professional styling with header, customer info, document details, payment summary, footer

### Frontend

1. **Print Utility** (`utils/printDocument.js`)
   - `printDocument()`: Main function for printing documents
   - `exportDocumentAsPdf()`: Export as PDF download
   - Handles HTML and PDF formats
   - Error handling and callbacks

2. **Updated Pages**
   - `app/(dashboard)/rent-invoices/page.jsx`: Uses new print utility
   - `app/(dashboard)/maintenance-invoices/page.jsx`: Uses new print utility

## Document Types Supported

### Invoices
- **Rent Invoice**: Monthly rent invoices with late fees and advance rent tracking
- **Maintenance Invoice**: Maintenance work invoices with line items, tax, discounts

### Receipts (Income Collections)
- **Security Deposit Slip**: Security deposit collection receipts
- **Advance Rent Receipt**: Advance rent payment receipts
- **Fee Collection Receipt**: Late fees, processing fees, etc.
- **Other Income Receipt**: Miscellaneous income receipts

### Refunds/Vouchers (Outgoing)
- **Security Deposit Refund**: Security deposit refund documents
- **Payment Voucher**: Outgoing payment vouchers

### Generic
- **Unified Payment Entry**: Generic receipt/voucher for any payment type

## Template Placeholders

All templates support the following placeholder structure:

- `{{company.name}}` - Company name from settings
- `{{company.address}}` - Company address
- `{{company.phone}}` - Company phone
- `{{company.email}}` - Company email
- `{{customer.name}}` - Customer/tenant name
- `{{customer.phone}}` - Customer phone
- `{{customer.email}}` - Customer email
- `{{document.number}}` - Document number
- `{{document.date}}` - Document date
- `{{document.due_date}}` - Due date
- `{{document.status}}` - Document status
- `{{document.payment_method}}` - Payment method
- `{{amount.total}}` - Total amount
- `{{amount.currency}}` - Currency code
- `{{unit.number}}` - Unit number
- `{{property.name}}` - Property name

Additional placeholders are available based on document type (e.g., `{{advance_rent.months}}`, `{{amount.deductions}}`, etc.)

## CORS & Mobile App Compatibility

- PrintController includes CORS headers in all responses
- ForceCors middleware handles preflight OPTIONS requests
- Mobile app origins are supported (file://, localhost, custom schemes)
- Headers include:
  - `Access-Control-Allow-Origin`
  - `Access-Control-Allow-Methods`
  - `Access-Control-Allow-Headers`
  - `Access-Control-Allow-Credentials`

## Next Steps (Testing & Deployment)

1. **Run Migration**
   ```bash
   cd backend
   php artisan migrate
   ```

2. **Run Seeder**
   ```bash
   php artisan db:seed --class=DocumentTemplateSeeder
   ```

3. **Test Print Functionality**
   - Test each document type via API
   - Test HTML output format
   - Test PDF output format
   - Test from web frontend
   - Test from mobile app (CORS)

4. **Test CORS**
   - Test from web browser
   - Test from mobile app (Flutter)
   - Test preflight OPTIONS requests
   - Verify headers in network tab

5. **Integration Testing**
   - Test rent invoice printing
   - Test maintenance invoice printing
   - Test receipt generation for all payment types
   - Test authorization (users can only print their landlord's documents)

## API Usage Examples

### Print HTML
```javascript
GET /api/v1/print/rent-invoice/123?format=html
Authorization: Bearer {token}
```

### Print PDF
```javascript
GET /api/v1/print/rent-invoice/123?format=pdf
Authorization: Bearer {token}
```

### Frontend Usage
```javascript
import { printDocument } from '@/utils/printDocument';

// Print as HTML
await printDocument('rent-invoice', invoiceId, {
  format: 'html',
  onError: (error) => console.error(error),
  onSuccess: () => console.log('Printed!')
});

// Export as PDF
import { exportDocumentAsPdf } from '@/utils/printDocument';
await exportDocumentAsPdf('rent-invoice', invoiceId, 'invoice-123');
```

## Files Created/Modified

### Created
- `backend/database/migrations/2025_01_23_000000_create_document_templates_table.php`
- `backend/app/Models/DocumentTemplate.php`
- `backend/app/Services/DocumentTemplateService.php`
- `backend/app/Http/Controllers/Api/V1/PrintController.php`
- `backend/database/seeders/DocumentTemplateSeeder.php`
- `frontend/utils/printDocument.js`

### Modified
- `backend/routes/api.php` (added print route)
- `frontend/app/(dashboard)/rent-invoices/page.jsx` (updated print handler)
- `frontend/app/(dashboard)/maintenance-invoices/page.jsx` (updated print handler)

## Notes

- Templates are stored in the database and can be customized per landlord
- Default templates are system-wide (landlord_id = null)
- The rendering engine supports nested placeholder paths (e.g., `{{company.name}}`)
- All document types are fully supported with proper data aggregation
- CORS is properly configured for mobile app access
