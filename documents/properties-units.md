# API Reference – Properties & Units (v1)

Base URL: `/api/v1`

All endpoints require an authenticated Sanctum token and operate within the authenticated landlord’s context. Responses are wrapped by Laravel’s pagination where applicable.

## Authentication

Include `Authorization: Bearer {token}` for all requests below. Tokens are issued via `POST /api/v1/auth/login`.

## Properties

### GET `/properties`
List properties owned by the current landlord.

**Query params**
- `per_page` – optional integer (default 15)

**Response**
`200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "landlord_id": 10,
      "name": "Coral View Apartments",
      "address": "Malé, Maldives",
      "type": "residential",
      "unit_count": 4,
      "created_at": "2025-11-08T16:40:40.000000Z"
    }
  ],
  "links": { "...": "..." },
  "meta": { "...": "..." }
}
```

### POST `/properties`
Create a property for the landlord.

**Body**
```json
{
  "name": "Lagoon Plaza",
  "address": "Hulhumalé, Lot 13",
  "type": "commercial" // residential | commercial
}
```

**Response**
`201 Created` with property resource.

### GET `/properties/{id}`
Retrieve a single property (403 if it doesn’t belong to the landlord).

### PUT `/properties/{id}`
Update any subset of `name`, `address`, `type`. Returns updated resource.

### DELETE `/properties/{id}`
Removes the property (and cascaded units). Returns `204 No Content`.

## Units

### GET `/units`
List units within the landlord’s portfolio.

**Query params**
- `per_page` – optional integer (default 15)
- `property_id` – filter by property
- `is_occupied` – boolean (`true` / `false`)

**Response**
`200 OK`
```json
{
  "data": [
    {
      "id": 15,
      "property_id": 3,
      "landlord_id": 10,
      "unit_type_id": 2,
      "unit_number": "A-101",
      "rent_amount": 15000,
      "security_deposit": 20000,
      "is_occupied": false,
      "property": { "id": 3, "name": "Coral View Apartments" },
      "unit_type": { "id": 2, "name": "1BHK" }
    }
  ],
  "links": { "...": "..." },
  "meta": { "...": "..." }
}
```

### POST `/units`

**Body**
```json
{
  "property_id": 3,
  "unit_type_id": 2,
  "unit_number": "B-204",
  "rent_amount": 18500,
  "security_deposit": 25000,
  "is_occupied": false
}
```
- `property_id` must belong to the current landlord.
- `unit_number` must be unique per `property_id`.

`201 Created` with unit resource.

### GET `/units/{id}`
Returns unit with property + unit type stubs. `403` if cross-landlord.

### PUT `/units/{id}`
Patch any fields listed above. Unspecified fields remain unchanged.

### DELETE `/units/{id}`
Removes unit, responding `204 No Content`.

## Tenants

### GET `/tenants`
Supports `per_page`, `status`, and `search` (matches name/email/phone). Returns paginated `TenantResource` collection.

### POST `/tenants`
Create a tenant profile.
```json
{
  "full_name": "Adam Ismail",
  "email": "adam@example.com",
  "phone": "7700001",
  "status": "active" // optional, defaults to active
}
```

### GET `/tenants/{id}`
Returns tenant plus active leases (each lease includes unit stub).

### PUT `/tenants/{id}`
Patch any tenant fields; email/phone must remain unique per landlord.

### DELETE `/tenants/{id}`
Soft delete isn’t enabled yet—record is removed. Use with caution.

## Tenant Leases

### GET `/tenant-units`
List lease agreements. Filters: `tenant_id`, `unit_id`, `status`, `per_page`.

### POST `/tenant-units`
Create a lease (`status` defaults to `active`). Active leases set the associated unit’s `is_occupied` flag.

### GET `/tenant-units/{id}`
Returns lease with tenant and unit stubs.

### PUT `/tenant-units/{id}`
Update lease metadata or status. Changing status to anything other than `active` automatically releases the unit if no other active leases exist.

### DELETE `/tenant-units/{id}`
Deletes the lease and syncs unit occupancy.

## Financial Records

### GET `/financial-records`
Filters: `type`, `status`, `tenant_unit_id`, `from`, `to`, `per_page`. Returns `FinancialRecordResource` collection with tenant/unit fragments.

### POST `/financial-records`
Create an income/expense ledger entry. Requires `tenant_unit_id`, `type`, `category`, `amount`, `description`, `transaction_date`, `status`.

### GET `/financial-records/{id}`
Full record with tenant/unit and any installments.

### PUT `/financial-records/{id}`
Update mutable fields. Installment records must include `parent_id`, `installment_number`, and `total_installments`.

### DELETE `/financial-records/{id}`
Owner-only. Removes the record (no soft delete yet).

## Rent Invoices

### GET `/rent-invoices`
Filters: `status`, `tenant_unit_id`, `per_page`. Returns invoice list with tenant info.

### POST `/rent-invoices`
Issue or log an invoice. Requires unique `invoice_number` per landlord, `invoice_date`, `due_date`, `rent_amount`. `status` defaults to `generated`.

### GET `/rent-invoices/{id}`
Single invoice payload.

### PUT `/rent-invoices/{id}`
Update invoice status/payment info. When `status` set to `paid`, pass `paid_date` and optional `payment_method`.

### DELETE `/rent-invoices/{id}`
Owner-only hard delete (no archive yet).

## Maintenance Requests

### GET `/maintenance-requests`
Filters: `unit_id`, `type`, `is_billable`, `maintenance_date_from`, `maintenance_date_to`, `per_page`.

### POST `/maintenance-requests`
Create a maintenance log entry. Requires `unit_id`, `description`, `cost`, `maintenance_date`. Optionally link an `asset_id` tied to the landlord’s inventory.

### GET `/maintenance-requests/{id}`
Returns request with unit (and asset if attached).

### PUT `/maintenance-requests/{id}`
Update fields; when `billed_to_tenant` is true you must provide `tenant_share`.

### DELETE `/maintenance-requests/{id}`
Owner-only. Removes the record.

## Asset Types

### GET `/asset-types`
Returns paginated list of global asset categories. Optional `per_page`.

### POST `/asset-types`
Admin/owner only. Payload requires unique `name`, optional `category`, `is_active`.

### PUT `/asset-types/{asset_type}`
Update metadata or activate/deactivate.

### DELETE `/asset-types/{asset_type}`
Owner/admin only. Removes the type (ensure no dependent assets first).

## Assets

### GET `/assets`
Filters: `status`, `ownership`, `unit_id`, `asset_type_id`, `per_page`. Returns `AssetResource` w/ type, unit, tenant summary.

### POST `/assets`
Create inventory entry for a unit. Requires `asset_type_id`, `unit_id`, `name`. When `ownership` is `tenant`, supply `tenant_id`.

### GET `/assets/{asset}`
Returns asset with linked type/unit/tenant.

### PUT `/assets/{asset}`
Update details. Switching ownership away from tenant clears `tenant_id`.

### DELETE `/assets/{asset}`
Owner/admin only.

## Notifications

### GET `/notifications`
Filters: `is_read`, `type`, `priority`, `from`, `to`, `per_page`. Returns landlord-scoped notifications.

### GET `/notifications/{notification}`
Fetch a single notification payload.

### PUT `/notifications/{notification}`
Update fields such as `is_read` or `priority`.

### DELETE `/notifications/{notification}`
Owner/admin only – hard deletes the message.

## Security Deposit Refunds

### GET `/security-deposit-refunds`
Filters: `status`, `tenant_unit_id`, `refund_number`, `from`, `to`, `per_page`. Returns refunds with tenant-unit summary.

### POST `/security-deposit-refunds`
Create a refund record after lease end. Requires `tenant_unit_id`, unique `refund_number`, `refund_date`, `original_deposit`, `refund_amount`.

### GET `/security-deposit-refunds/{refund}`
View specific refund details.

### PUT `/security-deposit-refunds/{refund}`
Update refund info (status, receipt flags, amounts).

### DELETE `/security-deposit-refunds/{refund}`
Owner only. Permanently deletes the record.

## Unit Occupancy History

### GET `/unit-occupancy-history`
Filters: `unit_id`, `tenant_id`, `action`, `from`, `to`, `per_page`. Returns chronological entries with unit/tenant snippets.

### POST `/unit-occupancy-history`
Create manual log entries (e.g., retroactive move-in/out). Requires `unit_id`, `tenant_id`, `tenant_unit_id`, `action`, `action_date`.

### GET `/unit-occupancy-history/{id}`
Fetch a single history record.

### PUT `/unit-occupancy-history/{id}`
Update metadata such as `notes`, dates, or amounts.

### DELETE `/unit-occupancy-history/{id}`
Owner/admin only.

## Reports

### GET `/reports/unified-payments`
Aggregated cashflow feed combining rent receipts, maintenance expenses, and security deposit refunds.

**Filters**
- `payment_type` – `rent`, `maintenance_expense`, `security_refund`
- `flow_direction` – `income`, `outgoing`
- `status` – matches source record status (e.g. `completed`, `pending`)
- `tenant_unit_id`, `unit_id`
- `from`, `to` – transaction date range
- `per_page`

**Response**
Paginated list of payments with tenant/unit context and original reference numbers.

## Errors
- `401 Unauthorized` – missing/invalid Sanctum token.
- `403 Forbidden` – attempting to access another landlord’s resource.
- `422 Unprocessable Entity` – validation failure (validation messages returned in `errors`).

