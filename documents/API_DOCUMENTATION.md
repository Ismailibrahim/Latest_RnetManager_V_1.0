# RentApplication API Documentation

**Version:** 1.0  
**Base URL:** `http://localhost:8000/api/v1` (development)  
**Authentication:** Bearer Token (Sanctum)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Properties](#properties)
3. [Units](#units)
4. [Tenants](#tenants)
5. [Tenant Units](#tenant-units)
6. [Financial Records](#financial-records)
7. [Rent Invoices](#rent-invoices)
8. [Maintenance Requests](#maintenance-requests)
9. [Maintenance Invoices](#maintenance-invoices)
10. [Assets](#assets)
11. [Security Deposit Refunds](#security-deposit-refunds)
12. [Unified Payments](#unified-payments)
13. [Payment Methods](#payment-methods)
14. [Notifications](#notifications)
15. [Account Management](#account-management)
16. [Other Resources](#other-resources)

---

## Authentication

### Login

Authenticate a user and receive an access token.

**Endpoint:** `POST /api/v1/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "device_name": "Web Browser" // optional
}
```

**Response:** `200 OK`
```json
{
  "token": "1|abcdef123456...",
  "token_type": "Bearer",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "role": "owner",
    "landlord": {
      "id": 1,
      "name": "ABC Properties"
    }
  }
}
```

**Error Response:** `422 Unprocessable Entity`
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["The email field is required."]
  }
}
```

### Get Current User

Get the authenticated user's information.

**Endpoint:** `GET /api/v1/auth/me`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "role": "owner",
    "landlord": {
      "id": 1,
      "name": "ABC Properties"
    }
  }
}
```

### Logout

Revoke the current access token.

**Endpoint:** `POST /api/v1/auth/logout`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully."
}
```

---

## Properties

### List Properties

Get a paginated list of properties for the authenticated landlord.

**Endpoint:** `GET /api/v1/properties`

**Query Parameters:**
- `per_page` (optional): Number of items per page (default: 15)
- `page` (optional): Page number

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "name": "Sunset Apartments",
      "address": "123 Main Street",
      "type": "apartment",
      "units_count": 5,
      "created_at": "2024-01-01T00:00:00.000000Z",
      "updated_at": "2024-01-01T00:00:00.000000Z"
    }
  ],
  "links": {
    "first": "...",
    "last": "...",
    "prev": null,
    "next": "..."
  },
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 10
  }
}
```

### Create Property

Create a new property.

**Endpoint:** `POST /api/v1/properties`

**Request Body:**
```json
{
  "name": "Sunset Apartments",
  "address": "123 Main Street",
  "type": "apartment"
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": 1,
    "name": "Sunset Apartments",
    "address": "123 Main Street",
    "type": "apartment",
    "units_count": 0,
    "created_at": "2024-01-01T00:00:00.000000Z",
    "updated_at": "2024-01-01T00:00:00.000000Z"
  }
}
```

### Get Property

Get a specific property with its units.

**Endpoint:** `GET /api/v1/properties/{id}`

**Response:** `200 OK`
```json
{
  "data": {
    "id": 1,
    "name": "Sunset Apartments",
    "address": "123 Main Street",
    "type": "apartment",
    "units": [
      {
        "id": 1,
        "unit_number": "101",
        "unit_type": {
          "id": 1,
          "name": "1 Bedroom"
        }
      }
    ],
    "created_at": "2024-01-01T00:00:00.000000Z",
    "updated_at": "2024-01-01T00:00:00.000000Z"
  }
}
```

### Update Property

Update a property.

**Endpoint:** `PATCH /api/v1/properties/{id}`

**Request Body:**
```json
{
  "name": "Updated Name",
  "address": "Updated Address"
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "id": 1,
    "name": "Updated Name",
    "address": "Updated Address",
    "type": "apartment",
    "updated_at": "2024-01-01T00:00:00.000000Z"
  }
}
```

### Delete Property

Delete a property.

**Endpoint:** `DELETE /api/v1/properties/{id}`

**Response:** `204 No Content`

---

## Units

### List Units

Get a paginated list of units.

**Endpoint:** `GET /api/v1/units`

**Query Parameters:**
- `per_page` (optional): Number of items per page
- `page` (optional): Page number
- `property_id` (optional): Filter by property ID
- `is_occupied` (optional): Filter by occupancy status (true/false)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "unit_number": "101",
      "property": {
        "id": 1,
        "name": "Sunset Apartments"
      },
      "unit_type": {
        "id": 1,
        "name": "1 Bedroom"
      },
      "is_occupied": false,
      "assets_count": 2,
      "created_at": "2024-01-01T00:00:00.000000Z"
    }
  ],
  "links": {...},
  "meta": {...}
}
```

### Create Unit

Create a new unit.

**Endpoint:** `POST /api/v1/units`

**Request Body:**
```json
{
  "property_id": 1,
  "unit_number": "101",
  "unit_type_id": 1,
  "is_occupied": false
}
```

**Response:** `201 Created`

### Get Unit

Get a specific unit.

**Endpoint:** `GET /api/v1/units/{id}`

### Update Unit

Update a unit.

**Endpoint:** `PATCH /api/v1/units/{id}`

### Delete Unit

Delete a unit.

**Endpoint:** `DELETE /api/v1/units/{id}`

---

## Tenants

### List Tenants

Get a paginated list of tenants.

**Endpoint:** `GET /api/v1/tenants`

**Query Parameters:**
- `per_page` (optional): Number of items per page
- `page` (optional): Page number
- `search` (optional): Search by name or email

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "full_name": "John Doe",
      "email": "john@example.com",
      "phone": "+960 1234567",
      "nationality": {
        "id": 1,
        "name": "Maldives"
      },
      "created_at": "2024-01-01T00:00:00.000000Z"
    }
  ],
  "links": {...},
  "meta": {...}
}
```

### Create Tenant

Create a new tenant.

**Endpoint:** `POST /api/v1/tenants`

**Request Body:**
```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "+960 1234567",
  "nationality_id": 1,
  "id_number": "A123456"
}
```

**Response:** `201 Created`

### Get Tenant

Get a specific tenant.

**Endpoint:** `GET /api/v1/tenants/{id}`

### Update Tenant

Update a tenant.

**Endpoint:** `PATCH /api/v1/tenants/{id}`

### Delete Tenant

Delete a tenant.

**Endpoint:** `DELETE /api/v1/tenants/{id}`

---

## Tenant Units

### List Tenant Units

Get a paginated list of tenant-unit assignments (leases).

**Endpoint:** `GET /api/v1/tenant-units`

**Query Parameters:**
- `per_page` (optional): Number of items per page
- `page` (optional): Page number
- `status` (optional): Filter by status (active, expired, etc.)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "tenant": {
        "id": 1,
        "full_name": "John Doe"
      },
      "unit": {
        "id": 1,
        "unit_number": "101"
      },
      "lease_start": "2024-01-01",
      "lease_end": "2024-12-31",
      "monthly_rent": 15000.00,
      "status": "active",
      "created_at": "2024-01-01T00:00:00.000000Z"
    }
  ],
  "links": {...},
  "meta": {...}
}
```

### Create Tenant Unit

Create a new tenant-unit assignment.

**Endpoint:** `POST /api/v1/tenant-units`

**Request Body:**
```json
{
  "tenant_id": 1,
  "unit_id": 1,
  "lease_start": "2024-01-01",
  "lease_end": "2024-12-31",
  "monthly_rent": 15000.00,
  "security_deposit_paid": 30000.00,
  "advance_rent_months": 1
}
```

**Response:** `201 Created`

### Get Tenant Unit

Get a specific tenant-unit assignment.

**Endpoint:** `GET /api/v1/tenant-units/{id}`

### Update Tenant Unit

Update a tenant-unit assignment.

**Endpoint:** `PATCH /api/v1/tenant-units/{id}`

### Delete Tenant Unit

Delete a tenant-unit assignment.

**Endpoint:** `DELETE /api/v1/tenant-units/{id}`

### Get Pending Charges

Get pending charges (invoices and financial records) for a tenant unit.

**Endpoint:** `GET /api/v1/tenant-units/{tenant_unit}/pending-charges`

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "type": "rent_invoice",
      "source_type": "rent_invoice",
      "source_id": 1,
      "description": "Rent Invoice #INV-001",
      "amount": 15000.00,
      "due_date": "2024-01-15",
      "status": "sent"
    },
    {
      "id": 2,
      "type": "financial_record",
      "source_type": "financial_record",
      "source_id": 2,
      "description": "Late Fee",
      "amount": 500.00,
      "due_date": "2024-01-15",
      "status": "pending"
    }
  ]
}
```

---

## Financial Records

### List Financial Records

Get a paginated list of financial records.

**Endpoint:** `GET /api/v1/financial-records`

**Query Parameters:**
- `per_page` (optional): Number of items per page
- `page` (optional): Page number
- `type` (optional): Filter by type (rent, expense, fee, etc.)
- `status` (optional): Filter by status (pending, completed, partial)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "type": "rent",
      "category": "monthly_rent",
      "amount": 15000.00,
      "description": "Monthly rent payment",
      "status": "completed",
      "transaction_date": "2024-01-01",
      "paid_date": "2024-01-01",
      "payment_method": "bank_transfer",
      "tenant_unit": {
        "id": 1,
        "tenant": {
          "full_name": "John Doe"
        },
        "unit": {
          "unit_number": "101"
        }
      }
    }
  ],
  "links": {...},
  "meta": {...}
}
```

### Create Financial Record

Create a new financial record.

**Endpoint:** `POST /api/v1/financial-records`

**Request Body:**
```json
{
  "tenant_unit_id": 1,
  "type": "rent",
  "category": "monthly_rent",
  "amount": 15000.00,
  "description": "Monthly rent payment",
  "due_date": "2024-01-15",
  "transaction_date": "2024-01-01"
}
```

**Response:** `201 Created`

### Get Financial Record

Get a specific financial record.

**Endpoint:** `GET /api/v1/financial-records/{id}`

### Update Financial Record

Update a financial record.

**Endpoint:** `PATCH /api/v1/financial-records/{id}`

### Delete Financial Record

Delete a financial record.

**Endpoint:** `DELETE /api/v1/financial-records/{id}`

---

## Rent Invoices

### List Rent Invoices

Get a paginated list of rent invoices.

**Endpoint:** `GET /api/v1/rent-invoices`

**Query Parameters:**
- `per_page` (optional): Number of items per page
- `page` (optional): Page number
- `status` (optional): Filter by status (generated, sent, paid, overdue, cancelled)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "invoice_number": "INV-001",
      "invoice_date": "2024-01-01",
      "due_date": "2024-01-15",
      "rent_amount": 15000.00,
      "late_fee": 0.00,
      "status": "sent",
      "tenant_unit": {
        "id": 1,
        "tenant": {
          "full_name": "John Doe"
        },
        "unit": {
          "unit_number": "101"
        }
      }
    }
  ],
  "links": {...},
  "meta": {...}
}
```

### Create Rent Invoice

Create a new rent invoice.

**Endpoint:** `POST /api/v1/rent-invoices`

**Request Body:**
```json
{
  "tenant_unit_id": 1,
  "invoice_date": "2024-01-01",
  "due_date": "2024-01-15",
  "rent_amount": 15000.00,
  "late_fee": 0.00
}
```

**Response:** `201 Created`

### Get Rent Invoice

Get a specific rent invoice.

**Endpoint:** `GET /api/v1/rent-invoices/{id}`

### Update Rent Invoice

Update a rent invoice.

**Endpoint:** `PATCH /api/v1/rent-invoices/{id}`

### Delete Rent Invoice

Delete a rent invoice.

**Endpoint:** `DELETE /api/v1/rent-invoices/{id}`

### Export Rent Invoice

Export a rent invoice as PDF.

**Endpoint:** `GET /api/v1/rent-invoices/{id}/export`

**Response:** `200 OK` (PDF file)

---

## Maintenance Requests

### List Maintenance Requests

Get a paginated list of maintenance requests.

**Endpoint:** `GET /api/v1/maintenance-requests`

**Query Parameters:**
- `per_page` (optional): Number of items per page
- `page` (optional): Page number
- `status` (optional): Filter by status (pending, in_progress, completed, cancelled)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "subject": "Leaky faucet",
      "description": "Kitchen faucet is leaking",
      "priority": "medium",
      "status": "pending",
      "tenant_unit": {
        "id": 1,
        "tenant": {
          "full_name": "John Doe"
        },
        "unit": {
          "unit_number": "101"
        }
      },
      "created_at": "2024-01-01T00:00:00.000000Z"
    }
  ],
  "links": {...},
  "meta": {...}
}
```

### Create Maintenance Request

Create a new maintenance request.

**Endpoint:** `POST /api/v1/maintenance-requests`

**Request Body:**
```json
{
  "tenant_unit_id": 1,
  "subject": "Leaky faucet",
  "description": "Kitchen faucet is leaking",
  "priority": "medium"
}
```

**Response:** `201 Created`

### Get Maintenance Request

Get a specific maintenance request.

**Endpoint:** `GET /api/v1/maintenance-requests/{id}`

### Update Maintenance Request

Update a maintenance request.

**Endpoint:** `PATCH /api/v1/maintenance-requests/{id}`

### Delete Maintenance Request

Delete a maintenance request.

**Endpoint:** `DELETE /api/v1/maintenance-requests/{id}`

---

## Maintenance Invoices

### List Maintenance Invoices

Get a paginated list of maintenance invoices.

**Endpoint:** `GET /api/v1/maintenance-invoices`

**Query Parameters:**
- `per_page` (optional): Number of items per page
- `page` (optional): Page number
- `status` (optional): Filter by status (draft, sent, approved, paid, overdue, cancelled)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "invoice_number": "MAINT-001",
      "invoice_date": "2024-01-01",
      "due_date": "2024-01-15",
      "labor_cost": 500.00,
      "parts_cost": 200.00,
      "tax_amount": 0.00,
      "grand_total": 700.00,
      "status": "sent",
      "maintenance_request": {
        "id": 1,
        "subject": "Leaky faucet"
      },
      "tenant_unit": {
        "id": 1,
        "tenant": {
          "full_name": "John Doe"
        },
        "unit": {
          "unit_number": "101"
        }
      }
    }
  ],
  "links": {...},
  "meta": {...}
}
```

### Create Maintenance Invoice

Create a new maintenance invoice.

**Endpoint:** `POST /api/v1/maintenance-invoices`

**Request Body:**
```json
{
  "tenant_unit_id": 1,
  "maintenance_request_id": 1,
  "invoice_date": "2024-01-01",
  "due_date": "2024-01-15",
  "labor_cost": 500.00,
  "parts_cost": 200.00,
  "tax_amount": 0.00,
  "line_items": [
    {
      "description": "Faucet repair",
      "quantity": 1,
      "unit_cost": 500.00,
      "total": 500.00
    }
  ]
}
```

**Response:** `201 Created`

### Get Maintenance Invoice

Get a specific maintenance invoice.

**Endpoint:** `GET /api/v1/maintenance-invoices/{id}`

### Update Maintenance Invoice

Update a maintenance invoice.

**Endpoint:** `PATCH /api/v1/maintenance-invoices/{id}`

### Delete Maintenance Invoice

Delete a maintenance invoice.

**Endpoint:** `DELETE /api/v1/maintenance-invoices/{id}`

---

## Assets

### List Assets

Get a paginated list of assets.

**Endpoint:** `GET /api/v1/assets`

**Query Parameters:**
- `per_page` (optional): Number of items per page
- `page` (optional): Page number
- `unit_id` (optional): Filter by unit ID
- `asset_type_id` (optional): Filter by asset type ID

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "name": "Refrigerator",
      "description": "Samsung 300L",
      "serial_number": "SN123456",
      "purchase_date": "2024-01-01",
      "purchase_price": 5000.00,
      "current_value": 4000.00,
      "status": "active",
      "unit": {
        "id": 1,
        "unit_number": "101"
      },
      "asset_type": {
        "id": 1,
        "name": "Appliances"
      }
    }
  ],
  "links": {...},
  "meta": {...}
}
```

### Create Asset

Create a new asset.

**Endpoint:** `POST /api/v1/assets`

**Request Body:**
```json
{
  "unit_id": 1,
  "asset_type_id": 1,
  "name": "Refrigerator",
  "description": "Samsung 300L",
  "serial_number": "SN123456",
  "purchase_date": "2024-01-01",
  "purchase_price": 5000.00,
  "current_value": 4000.00
}
```

**Response:** `201 Created`

### Get Asset

Get a specific asset.

**Endpoint:** `GET /api/v1/assets/{id}`

### Update Asset

Update an asset.

**Endpoint:** `PATCH /api/v1/assets/{id}`

### Delete Asset

Delete an asset.

**Endpoint:** `DELETE /api/v1/assets/{id}`

---

## Security Deposit Refunds

### List Security Deposit Refunds

Get a paginated list of security deposit refunds.

**Endpoint:** `GET /api/v1/security-deposit-refunds`

**Query Parameters:**
- `per_page` (optional): Number of items per page
- `page` (optional): Page number
- `status` (optional): Filter by status (pending, processed, cancelled)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "refund_number": "REF-001",
      "refund_date": "2024-01-01",
      "original_deposit": 30000.00,
      "deductions": 5000.00,
      "refund_amount": 25000.00,
      "status": "processed",
      "payment_method": "bank_transfer",
      "transaction_reference": "TXN123456",
      "tenant_unit": {
        "id": 1,
        "tenant": {
          "full_name": "John Doe"
        },
        "unit": {
          "unit_number": "101"
        }
      }
    }
  ],
  "links": {...},
  "meta": {...}
}
```

### Create Security Deposit Refund

Create a new security deposit refund.

**Endpoint:** `POST /api/v1/security-deposit-refunds`

**Request Body:**
```json
{
  "tenant_unit_id": 1,
  "refund_date": "2024-01-01",
  "original_deposit": 30000.00,
  "deductions": 5000.00,
  "deduction_note": "Cleaning and repairs",
  "payment_method": "bank_transfer",
  "transaction_reference": "TXN123456"
}
```

**Response:** `201 Created`

### Get Security Deposit Refund

Get a specific security deposit refund.

**Endpoint:** `GET /api/v1/security-deposit-refunds/{id}`

### Update Security Deposit Refund

Update a security deposit refund.

**Endpoint:** `PATCH /api/v1/security-deposit-refunds/{id}`

### Delete Security Deposit Refund

Delete a security deposit refund.

**Endpoint:** `DELETE /api/v1/security-deposit-refunds/{id}`

---

## Unified Payments

### List Unified Payments

Get a paginated list of unified payment entries.

**Endpoint:** `GET /api/v1/payments`

**Query Parameters:**
- `per_page` (optional): Number of items per page
- `page` (optional): Page number
- `payment_type` (optional): Filter by payment type (rent, fee, maintenance_expense, etc.)
- `status` (optional): Filter by status (pending, completed, partial, cancelled, etc.)
- `tenant_unit_id` (optional): Filter by tenant unit ID

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "payment_type": "rent",
      "flow_direction": "income",
      "amount": 15000.00,
      "currency": "MVR",
      "description": "November rent payment",
      "status": "completed",
      "payment_method": "bank_transfer",
      "reference_number": "PAY-001",
      "transaction_date": "2024-01-01",
      "source_type": "rent_invoice",
      "source_id": 1,
      "tenant_unit": {
        "id": 1,
        "tenant": {
          "full_name": "John Doe"
        },
        "unit": {
          "unit_number": "101"
        }
      },
      "created_at": "2024-01-01T00:00:00.000000Z"
    }
  ],
  "links": {...},
  "meta": {...}
}
```

### Create Unified Payment

Create a new unified payment entry.

**Endpoint:** `POST /api/v1/payments`

**Request Body:**
```json
{
  "payment_type": "rent",
  "tenant_unit_id": 1,
  "amount": 15000.00,
  "currency": "MVR",
  "description": "November rent payment",
  "status": "completed",
  "payment_method": "bank_transfer",
  "reference_number": "PAY-001",
  "transaction_date": "2024-01-01",
  "source_type": "rent_invoice",
  "source_id": 1,
  "metadata": {
    "notes": "Payment received via bank transfer"
  }
}
```

**Response:** `201 Created`

### Get Unified Payment

Get a specific unified payment entry.

**Endpoint:** `GET /api/v1/payments/{id}`

### Capture Payment

Capture a pending payment (mark as completed or partial).

**Endpoint:** `POST /api/v1/payments/{id}/capture`

**Request Body:**
```json
{
  "status": "completed",
  "payment_method": "bank_transfer",
  "reference_number": "TXN123456",
  "transaction_date": "2024-01-01"
}
```

**Response:** `200 OK`

### Void Payment

Void a payment (cancel, fail, or refund).

**Endpoint:** `POST /api/v1/payments/{id}/void`

**Request Body:**
```json
{
  "status": "cancelled",
  "reason": "Customer request"
}
```

**Response:** `200 OK`

---

## Payment Methods

### List Payment Methods

Get a list of payment methods.

**Endpoint:** `GET /api/v1/payment-methods`

**Query Parameters:**
- `only_active` (optional): Filter only active methods (1 or 0)
- `per_page` (optional): Number of items per page

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "name": "bank_transfer",
      "display_name": "Bank Transfer",
      "is_active": true,
      "supports_reference": true,
      "sort_order": 1
    },
    {
      "id": 2,
      "name": "cash",
      "display_name": "Cash Payment",
      "is_active": true,
      "supports_reference": false,
      "sort_order": 2
    }
  ]
}
```

### Create Payment Method

Create a new payment method.

**Endpoint:** `POST /api/v1/payment-methods`

**Request Body:**
```json
{
  "name": "credit_card",
  "display_name": "Credit Card",
  "is_active": true,
  "supports_reference": true,
  "sort_order": 3
}
```

**Response:** `201 Created`

### Get Payment Method

Get a specific payment method.

**Endpoint:** `GET /api/v1/payment-methods/{id}`

### Update Payment Method

Update a payment method.

**Endpoint:** `PATCH /api/v1/payment-methods/{id}`

### Delete Payment Method

Delete a payment method.

**Endpoint:** `DELETE /api/v1/payment-methods/{id}`

---

## Notifications

### List Notifications

Get a paginated list of notifications for the authenticated user.

**Endpoint:** `GET /api/v1/notifications`

**Query Parameters:**
- `per_page` (optional): Number of items per page
- `page` (optional): Page number
- `unread_only` (optional): Filter only unread notifications

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "type": "rent_overdue",
      "title": "Rent Overdue",
      "message": "Rent invoice INV-001 is overdue",
      "is_read": false,
      "created_at": "2024-01-01T00:00:00.000000Z"
    }
  ],
  "links": {...},
  "meta": {...}
}
```

### Get Notification

Get a specific notification.

**Endpoint:** `GET /api/v1/notifications/{id}`

### Update Notification

Mark a notification as read.

**Endpoint:** `PATCH /api/v1/notifications/{id}`

**Request Body:**
```json
{
  "is_read": true
}
```

**Response:** `200 OK`

### Delete Notification

Delete a notification.

**Endpoint:** `DELETE /api/v1/notifications/{id}`

**Response:** `204 No Content`

---

## Account Management

### Get Account

Get the authenticated user's account information.

**Endpoint:** `GET /api/v1/account`

**Response:** `200 OK`
```json
{
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "role": "owner",
    "landlord": {
      "id": 1,
      "name": "ABC Properties"
    }
  }
}
```

### Update Account

Update the authenticated user's account information.

**Endpoint:** `PATCH /api/v1/account`

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```

**Response:** `200 OK`

### Update Password

Update the authenticated user's password.

**Endpoint:** `PATCH /api/v1/account/password`

**Request Body:**
```json
{
  "current_password": "oldpassword123",
  "password": "newpassword123",
  "password_confirmation": "newpassword123"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password updated successfully."
}
```

### Account Delegates

Manage account delegates (sub-users).

**List Delegates:** `GET /api/v1/account/delegates`

**Create Delegate:** `POST /api/v1/account/delegates`

**Update Delegate:** `PATCH /api/v1/account/delegates/{id}`

**Delete Delegate:** `DELETE /api/v1/account/delegates/{id}`

---

## Other Resources

### Unit Types

**List Unit Types:** `GET /api/v1/unit-types`

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "name": "1 Bedroom",
      "description": "One bedroom apartment"
    },
    {
      "id": 2,
      "name": "2 Bedroom",
      "description": "Two bedroom apartment"
    }
  ]
}
```

### Nationalities

**List Nationalities:** `GET /api/v1/nationalities`

**Create Nationality:** `POST /api/v1/nationalities`

**Get Nationality:** `GET /api/v1/nationalities/{id}`

**Update Nationality:** `PATCH /api/v1/nationalities/{id}`

**Delete Nationality:** `DELETE /api/v1/nationalities/{id}`

### Asset Types

**List Asset Types:** `GET /api/v1/asset-types`

**Create Asset Type:** `POST /api/v1/asset-types`

**Get Asset Type:** `GET /api/v1/asset-types/{id}`

**Update Asset Type:** `PATCH /api/v1/asset-types/{id}`

**Delete Asset Type:** `DELETE /api/v1/asset-types/{id}`

### Tenant Documents

**List Tenant Documents:** `GET /api/v1/tenants/{tenant}/documents`

**Create Tenant Document:** `POST /api/v1/tenants/{tenant}/documents`

**Get Tenant Document:** `GET /api/v1/tenants/{tenant}/documents/{id}`

**Update Tenant Document:** `PATCH /api/v1/tenants/{tenant}/documents/{id}`

**Delete Tenant Document:** `DELETE /api/v1/tenants/{tenant}/documents/{id}`

### Unit Occupancy History

**List Occupancy History:** `GET /api/v1/unit-occupancy-history`

**Create Occupancy History:** `POST /api/v1/unit-occupancy-history`

**Get Occupancy History:** `GET /api/v1/unit-occupancy-history/{id}`

**Update Occupancy History:** `PATCH /api/v1/unit-occupancy-history/{id}`

**Delete Occupancy History:** `DELETE /api/v1/unit-occupancy-history/{id}`

### Billing Settings

**Get Billing Settings:** `GET /api/v1/settings/billing`

---

## Error Responses

All endpoints may return the following error responses:

### 401 Unauthorized
```json
{
  "message": "Unauthenticated."
}
```

### 403 Forbidden
```json
{
  "message": "This action is unauthorized."
}
```

### 404 Not Found
```json
{
  "message": "Resource not found."
}
```

### 422 Validation Error
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "field_name": [
      "The field name is required.",
      "The field name must be a string."
    ]
  }
}
```

### 500 Server Error
```json
{
  "message": "Server Error"
}
```

---

## Pagination

Most list endpoints support pagination. The response includes:

- `data`: Array of resources
- `links`: Pagination links (first, last, prev, next)
- `meta`: Pagination metadata (current_page, per_page, total, etc.)

**Example:**
```json
{
  "data": [...],
  "links": {
    "first": "http://localhost:8000/api/v1/properties?page=1",
    "last": "http://localhost:8000/api/v1/properties?page=10",
    "prev": null,
    "next": "http://localhost:8000/api/v1/properties?page=2"
  },
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 150,
    "last_page": 10
  }
}
```

---

## Rate Limiting

API requests are rate-limited. Check response headers for rate limit information:

- `X-RateLimit-Limit`: Maximum number of requests
- `X-RateLimit-Remaining`: Remaining requests in the current window
- `Retry-After`: Seconds to wait before retrying (if rate limit exceeded)

---

## Notes

- All dates are in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.ssssssZ)
- All monetary amounts are in decimal format (e.g., 15000.00)
- Currency is typically MVR (Maldivian Rufiyaa) but can be configured
- All timestamps are in UTC
- Authentication token should be included in the `Authorization` header for protected endpoints
- Token expires after a period of inactivity (configurable)

---

**Last Updated:** 2024-01-01  
**API Version:** 1.0

