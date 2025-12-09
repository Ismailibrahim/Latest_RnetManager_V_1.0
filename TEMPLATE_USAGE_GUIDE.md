# Template System Usage Guide

## Overview

The configurable invoice/receipt rendering system allows you to print any document type using database-stored HTML templates with placeholder replacement.

## Frontend Usage (React/JavaScript)

### Basic Usage

```javascript
import { printDocument } from '@/utils/printDocument';

// Print a rent invoice as HTML (opens print dialog)
await printDocument('rent-invoice', invoiceId, {
  format: 'html',
  onError: (error) => {
    console.error('Print failed:', error);
    // Show error message to user
  },
  onSuccess: () => {
    console.log('Print successful!');
    // Optional: Show success message
  },
});
```

### Print as PDF

```javascript
import { printDocument } from '@/utils/printDocument';

// Print as PDF (opens in new window with print dialog)
await printDocument('rent-invoice', invoiceId, {
  format: 'pdf',
  onError: (error) => {
    setFlashMessage(error);
  },
});
```

### Export as PDF (Download)

```javascript
import { exportDocumentAsPdf } from '@/utils/printDocument';

// Download PDF file
await exportDocumentAsPdf('rent-invoice', invoiceId, 'invoice-123');
```

### Example: Print Button in React Component

```jsx
import { printDocument } from '@/utils/printDocument';
import { Printer } from 'lucide-react';

function InvoiceRow({ invoice }) {
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState(null);

  const handlePrint = async () => {
    setPrinting(true);
    setError(null);
    
    try {
      await printDocument('rent-invoice', invoice.id, {
        format: 'html',
        onError: (err) => {
          setError(err);
          setPrinting(false);
        },
        onSuccess: () => {
          setPrinting(false);
        },
      });
    } catch (err) {
      setError(err.message);
      setPrinting(false);
    }
  };

  return (
    <div>
      <button
        onClick={handlePrint}
        disabled={printing}
        className="flex items-center gap-2"
      >
        <Printer size={16} />
        {printing ? 'Printing...' : 'Print Invoice'}
      </button>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
```

## Supported Document Types

### Invoices
- `'rent-invoice'` - Rent invoices
- `'maintenance-invoice'` - Maintenance invoices

### Receipts (Income)
- `'security-deposit-slip'` - Security deposit collection
- `'advance-rent-receipt'` - Advance rent payment
- `'fee-collection-receipt'` - Fee collections (late fees, etc.)
- `'other-income-receipt'` - Other income receipts

### Refunds/Vouchers (Outgoing)
- `'security-deposit-refund'` - Security deposit refunds
- `'payment-voucher'` - Payment vouchers

### Generic
- `'unified-payment-entry'` - Generic receipt/voucher for any payment

## API Usage (Direct HTTP Requests)

### Print HTML Format

```bash
GET /api/v1/print/{type}/{id}?format=html
Authorization: Bearer {token}
```

**Response:**
```json
{
  "html": "<!doctype html>...",
  "type": "rent-invoice",
  "id": 123
}
```

### Print PDF Format

```bash
GET /api/v1/print/{type}/{id}?format=pdf
Authorization: Bearer {token}
```

**Response:** PDF binary file with headers:
- `Content-Type: application/pdf`
- `Content-Disposition: inline; filename="invoice-123.pdf"`

### Example: Using cURL

```bash
# Print rent invoice as HTML
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/v1/print/rent-invoice/1?format=html"

# Print rent invoice as PDF
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/v1/print/rent-invoice/1?format=pdf" \
  --output invoice.pdf

# Print maintenance invoice
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/v1/print/maintenance-invoice/5?format=html"

# Print security deposit receipt
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/v1/print/security-deposit-slip/10?format=html"
```

## Template Placeholders

Templates use `{{placeholder}}` syntax with dot notation for nested data.

### Common Placeholders (Available for All Types)

```html
<!-- Company Information -->
{{company.name}}
{{company.address}}
{{company.phone}}
{{company.email}}

<!-- Customer Information -->
{{customer.name}}
{{customer.phone}}
{{customer.email}}

<!-- Document Information -->
{{document.number}}
{{document.date}}
{{document.due_date}}
{{document.status}}
{{document.payment_method}}

<!-- Amount Information -->
{{amount.total}}
{{amount.currency}}

<!-- Unit/Property Information -->
{{unit.number}}
{{property.name}}
```

### Rent Invoice Specific Placeholders

```html
{{amount.rent}}           <!-- Rent amount -->
{{amount.late_fee}}       <!-- Late fee -->
{{amount.subtotal}}       <!-- Subtotal -->
{{amount.advance_rent_applied}}  <!-- Advance rent applied -->
{{amount.amount_due}}     <!-- Amount due -->
{{advance_rent.applied}}  <!-- Boolean: advance rent applied -->
{{advance_rent.amount}}   <!-- Advance rent amount -->
{{advance_rent.fully_covered}}  <!-- Boolean: fully covered -->
```

### Maintenance Invoice Specific Placeholders

```html
{{amount.labor_cost}}     <!-- Labor cost -->
{{amount.parts_cost}}     <!-- Parts cost -->
{{amount.misc_amount}}    <!-- Miscellaneous amount -->
{{amount.cost}}           <!-- Total cost -->
{{amount.subtotal}}       <!-- Subtotal -->
{{amount.tax}}            <!-- Tax amount -->
{{amount.discount}}       <!-- Discount amount -->
{{maintenance_request.id}} <!-- Maintenance request ID -->
{{maintenance_request.description}} <!-- Request description -->
```

### Security Deposit Refund Specific Placeholders

```html
{{amount.original_deposit}}  <!-- Original deposit amount -->
{{amount.deductions}}        <!-- Deductions amount -->
{{document.receipt_number}}  <!-- Receipt number -->
{{document.transaction_reference}} <!-- Transaction reference -->
{{deduction_reasons}}        <!-- Array of deduction reasons -->
```

### Advance Rent Receipt Specific Placeholders

```html
{{advance_rent.months}}      <!-- Number of months -->
{{advance_rent.amount}}      <!-- Advance rent amount -->
{{advance_rent.collected_date}} <!-- Collection date -->
```

## Template Customization

### Viewing Templates

Templates are stored in the `document_templates` table. You can query them:

```php
use App\Models\DocumentTemplate;

// Get default template for rent invoice
$template = DocumentTemplate::getDefaultTemplate('rent_invoice');

// Get template for specific landlord (or default if not found)
$template = DocumentTemplate::getTemplate($landlordId, 'rent_invoice');
```

### Creating Custom Templates

You can create custom templates per landlord:

```php
use App\Models\DocumentTemplate;

DocumentTemplate::create([
    'landlord_id' => $landlordId,
    'type' => 'rent_invoice',
    'name' => 'Custom Rent Invoice Template',
    'template_html' => '<!doctype html>
<html>
<head>
    <title>{{document.number}}</title>
    <style>
        /* Your custom styles */
    </style>
</head>
<body>
    <h1>{{company.name}}</h1>
    <p>Invoice #{{document.number}}</p>
    <p>Customer: {{customer.name}}</p>
    <p>Amount: {{amount.currency}} {{amount.total}}</p>
</body>
</html>',
    'is_default' => false,
]);
```

### Template Structure

Templates should be complete HTML documents:

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{document.number}}</title>
    <style>
        /* Your CSS styles */
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }
    </style>
</head>
<body>
    <!-- Your template content with placeholders -->
    <h1>{{company.name}}</h1>
    <p>Invoice: {{document.number}}</p>
    <p>Date: {{document.date}}</p>
    <p>Customer: {{customer.name}}</p>
    <p>Amount: {{amount.currency}} {{amount.total}}</p>
</body>
</html>
```

## Complete Examples

### Example 1: Print Rent Invoice from Table Row

```jsx
import { printDocument } from '@/utils/printDocument';

function RentInvoicesTable({ invoices }) {
  const handlePrint = async (invoice) => {
    try {
      await printDocument('rent-invoice', invoice.id, {
        format: 'html',
        onError: (error) => {
          alert(`Print failed: ${error}`);
        },
      });
    } catch (err) {
      console.error('Print error:', err);
    }
  };

  return (
    <table>
      {invoices.map(invoice => (
        <tr key={invoice.id}>
          <td>{invoice.invoice_number}</td>
          <td>
            <button onClick={() => handlePrint(invoice)}>
              Print
            </button>
          </td>
        </tr>
      ))}
    </table>
  );
}
```

### Example 2: Print Security Deposit Receipt

```jsx
import { printDocument } from '@/utils/printDocument';

function SecurityDepositButton({ paymentId }) {
  const handlePrint = async () => {
    await printDocument('security-deposit-slip', paymentId, {
      format: 'html',
      onError: (error) => {
        console.error(error);
      },
    });
  };

  return (
    <button onClick={handlePrint}>
      Print Receipt
    </button>
  );
}
```

### Example 3: Export Multiple Documents as PDF

```jsx
import { exportDocumentAsPdf } from '@/utils/printDocument';

async function exportAllInvoices(invoices) {
  for (const invoice of invoices) {
    try {
      await exportDocumentAsPdf(
        'rent-invoice',
        invoice.id,
        `invoice-${invoice.invoice_number}`
      );
      // Small delay to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`Failed to export invoice ${invoice.id}:`, err);
    }
  }
}
```

### Example 4: Mobile App Usage (Flutter/Dart)

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

Future<void> printDocument(String type, int id) async {
  final token = await getAuthToken(); // Your token retrieval method
  
  final url = Uri.parse(
    'https://your-api.com/api/v1/print/$type/$id?format=html'
  );
  
  final response = await http.get(
    url,
    headers: {
      'Authorization': 'Bearer $token',
      'Accept': 'application/json',
    },
  );
  
  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    final html = data['html'];
    
    // Use a WebView or HTML renderer to display and print
    // Example with flutter_inappwebview:
    // await webView.loadData(data: html, mimeType: 'text/html');
  }
}
```

## Error Handling

### Common Errors

1. **"Template not found"** - Default template not seeded or landlord template missing
   - Solution: Run `php artisan db:seed --class=DocumentTemplateSeeder`

2. **"Document not found"** - Invalid document ID
   - Solution: Verify the document exists and ID is correct

3. **"Unauthorized access"** - User doesn't own the document
   - Solution: Check user's landlord_id matches document's landlord_id

4. **"Failed to render template"** - Template syntax error
   - Solution: Check template HTML for syntax errors

### Error Handling Example

```javascript
try {
  await printDocument('rent-invoice', invoiceId, {
    format: 'html',
    onError: (error) => {
      // Handle specific error types
      if (error.includes('Template not found')) {
        alert('Template not configured. Please contact administrator.');
      } else if (error.includes('Unauthorized')) {
        alert('You do not have permission to print this document.');
      } else {
        alert(`Print failed: ${error}`);
      }
    },
  });
} catch (err) {
  console.error('Unexpected error:', err);
  alert('An unexpected error occurred. Please try again.');
}
```

## Best Practices

1. **Always handle errors** - Use `onError` callback or try-catch
2. **Show loading state** - Disable buttons while printing
3. **Use appropriate format** - HTML for quick preview, PDF for downloads
4. **Test templates** - Verify placeholders work before deploying
5. **Mobile compatibility** - Ensure templates are responsive for mobile printing

## Template Data Structure

The service automatically prepares data in this structure:

```php
[
    'company' => [
        'name' => 'Company Name',
        'address' => 'Address',
        'phone' => 'Phone',
        'email' => 'Email',
    ],
    'customer' => [
        'name' => 'Customer Name',
        'phone' => 'Phone',
        'email' => 'Email',
    ],
    'document' => [
        'number' => 'INV-001',
        'date' => '01 Jan 2025',
        'due_date' => '31 Jan 2025',
        'status' => 'paid',
        'payment_method' => 'BANK TRANSFER',
    ],
    'amount' => [
        'total' => '15000.00',
        'currency' => 'MVR',
        // ... type-specific fields
    ],
    'unit' => [
        'number' => '101',
    ],
    'property' => [
        'name' => 'Property Name',
    ],
]
```

## Summary

- **Frontend**: Use `printDocument()` or `exportDocumentAsPdf()` from `@/utils/printDocument`
- **API**: Call `GET /api/v1/print/{type}/{id}?format=html|pdf`
- **Templates**: Use `{{placeholder}}` syntax with dot notation
- **Customization**: Create landlord-specific templates in database
- **All document types**: Supported with automatic data preparation

The system is fully integrated and ready to use!
