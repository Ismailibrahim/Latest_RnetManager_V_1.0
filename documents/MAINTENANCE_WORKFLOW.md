# Maintenance Request and Maintenance Invoice Workflow

## Overview

The system has two related but distinct features for managing maintenance:

1. **Maintenance Requests** - Track maintenance work that needs to be done or has been completed
2. **Maintenance Invoices** - Bill tenants for maintenance costs (can optionally link to a maintenance request)

## Maintenance Requests

### Purpose
Maintenance Requests track maintenance work performed on units. They record:
- What maintenance was done
- When it was done
- How much it cost
- Who performed it
- Whether it's billable to tenants

### Key Fields

**Required Fields:**
- `unit_id` - The unit where maintenance was performed
- `description` - Description of the maintenance work
- `cost` - Total cost of the maintenance (MVR)
- `maintenance_date` - Date when maintenance was performed

**Optional Fields:**
- `asset_id` - Link to a specific asset (e.g., AC unit, water heater)
- `location` - Specific location within the unit
- `serviced_by` - Name of vendor/contractor who performed the work
- `invoice_number` - External invoice number from vendor
- `type` - Type of maintenance: `repair`, `replacement`, or `service`
- `is_billable` - Whether this cost can be billed (default: `true`)
- `billed_to_tenant` - Whether tenant should be charged (default: `false`)
- `tenant_share` - Amount tenant should pay (required if `billed_to_tenant` is `true`)

### Relationships
- **Belongs to Unit** - Each request is tied to a specific unit
- **Belongs to Landlord** - Scoped to landlord's properties
- **Belongs to Asset** (optional) - Can link to a specific asset

### Use Cases
1. **Record completed maintenance** - Track repairs, replacements, or service work
2. **Track costs** - Record how much maintenance costs
3. **Vendor management** - Track who performed the work
4. **Billing preparation** - Mark if tenant should be charged

### Important Notes
- Maintenance Requests are **NOT** automatically linked to tenant units
- They track work done on units, but don't create invoices automatically
- The `invoice_number` field is for external vendor invoices, not system-generated invoices

## Maintenance Invoices

### Purpose
Maintenance Invoices are formal billing documents sent to tenants for maintenance costs. They are similar to rent invoices but specifically for maintenance charges.

### Key Fields

**Required Fields:**
- `tenant_unit_id` - The tenant-unit relationship being billed
- `invoice_date` - Date invoice was created
- `due_date` - Date payment is due
- `labor_cost` - Cost of labor (MVR)
- `parts_cost` - Cost of parts (MVR)
- `grand_total` - Total amount due (calculated: labor + parts + tax + misc - discount)

**Optional Fields:**
- `maintenance_request_id` - **Optional link** to a maintenance request
- `tax_amount` - Tax amount (MVR)
- `misc_amount` - Miscellaneous charges (MVR)
- `discount_amount` - Discount amount (MVR)
- `line_items` - Array of detailed line items (JSON)
- `notes` - Additional notes
- `status` - Invoice status: `draft`, `sent`, `approved`, `paid`, `overdue`, `cancelled`
- `paid_date` - Date payment was received
- `payment_method` - How payment was made
- `reference_number` - Payment reference number

### Relationships
- **Belongs to TenantUnit** - Links to a specific tenant-unit relationship
- **Belongs to MaintenanceRequest** (optional) - Can optionally link to a maintenance request
- **Belongs to Landlord** - Scoped to landlord

### Invoice Calculation
The system validates that:
```
grand_total = labor_cost + parts_cost + tax_amount + misc_amount - discount_amount
```

### Status Flow
1. **draft** - Invoice is being prepared
2. **sent** - Invoice has been sent to tenant
3. **approved** - Tenant has approved the invoice
4. **paid** - Payment has been received
5. **overdue** - Payment is past due date
6. **cancelled** - Invoice was cancelled

### Use Cases
1. **Bill tenant for maintenance** - Create invoice for maintenance costs
2. **Link to maintenance request** - Optionally reference the original maintenance work
3. **Track payments** - Record when and how payment was received
4. **Detailed billing** - Use line items for itemized charges

## Relationship Between Maintenance Requests and Invoices

### Key Points

1. **Optional Relationship**
   - Maintenance Invoices can optionally link to a Maintenance Request via `maintenance_request_id`
   - This is **NOT required** - invoices can be created independently

2. **Different Scopes**
   - **Maintenance Requests** are linked to **Units** (property-level)
   - **Maintenance Invoices** are linked to **TenantUnits** (tenant-level)
   - A unit might have maintenance, but no tenant to bill
   - A tenant might be billed for maintenance that wasn't tracked as a request

3. **Workflow Examples**

   **Scenario A: Tracked Maintenance → Invoice**
   ```
   1. Create Maintenance Request (unit_id, cost, billed_to_tenant=true)
   2. Create Maintenance Invoice (tenant_unit_id, maintenance_request_id)
   ```

   **Scenario B: Direct Invoice (No Request)**
   ```
   1. Create Maintenance Invoice directly (tenant_unit_id, no maintenance_request_id)
   ```

   **Scenario C: Request Without Invoice**
   ```
   1. Create Maintenance Request (unit_id, billed_to_tenant=false)
   (No invoice needed - landlord absorbs cost)
   ```

### When to Use Each

**Use Maintenance Request when:**
- You want to track maintenance work done on a unit
- You need to record vendor information
- You want to track maintenance history
- You need to know what maintenance was done, regardless of billing

**Use Maintenance Invoice when:**
- You need to bill a tenant for maintenance
- You need a formal invoice document
- You need to track payment status
- You need detailed line items for billing

**Link them when:**
- You want to connect the invoice to the original maintenance work
- You want to see which maintenance requests resulted in invoices
- You want to track the full lifecycle from work → billing → payment

## API Endpoints

### Maintenance Requests
- `GET /api/v1/maintenance-requests` - List requests (filterable by unit, type, date, billable)
- `POST /api/v1/maintenance-requests` - Create request
- `GET /api/v1/maintenance-requests/{id}` - Get single request
- `PUT /api/v1/maintenance-requests/{id}` - Update request
- `DELETE /api/v1/maintenance-requests/{id}` - Delete request

### Maintenance Invoices
- `GET /api/v1/maintenance-invoices` - List invoices (filterable by status, tenant_unit, maintenance_request)
- `POST /api/v1/maintenance-invoices` - Create invoice
- `GET /api/v1/maintenance-invoices/{id}` - Get single invoice
- `PUT /api/v1/maintenance-invoices/{id}` - Update invoice
- `DELETE /api/v1/maintenance-invoices/{id}` - Delete invoice

## Frontend Pages

### Maintenance Requests Page (`/maintenance`)
- View all maintenance requests
- Create/edit/delete requests
- Filter by unit, type, billable status, date range
- Track maintenance work and costs

### Maintenance Invoices Page (`/maintenance-invoices`)
- View all maintenance invoices
- Create/edit invoices
- Link to maintenance requests (optional)
- Track invoice status and payments
- Export invoices as PDF

## Best Practices

1. **Always create Maintenance Requests** for work done, even if not billing tenant
   - Provides maintenance history
   - Helps track unit condition
   - Useful for property management

2. **Link invoices to requests when possible**
   - Maintains audit trail
   - Shows connection between work and billing
   - Helps with reporting

3. **Use line items for detailed invoices**
   - Break down labor, parts, and other charges
   - Provides transparency to tenants
   - Better for accounting

4. **Set appropriate statuses**
   - Use `draft` while preparing
   - Mark `sent` when delivered to tenant
   - Update to `paid` when payment received

5. **Track payment details**
   - Record payment method
   - Store reference numbers
   - Update paid_date

## Summary

- **Maintenance Requests** = Track maintenance work (unit-level, optional billing flags)
- **Maintenance Invoices** = Bill tenants for maintenance (tenant-level, formal invoices)
- **Relationship** = Optional link between them
- **Use both** for complete maintenance management and billing workflow

