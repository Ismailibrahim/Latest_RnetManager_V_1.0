# Mobile API Summary

This document provides a concise overview of the mobile‑specific API endpoints available in the Rent_V2 backend. All routes are prefixed with `/api/v1/mobile` and are protected by the `auth:sanctum` middleware (except health checks). The endpoints are designed for efficient consumption by the mobile application.

## Endpoint Table

| HTTP Method | URL Path | Controller & Method | Description |
|-------------|----------|---------------------|-------------|
| GET | `/api/v1/mobile/properties` | `MobilePropertyController@index` | List all properties belonging to the authenticated landlord.
| GET | `/api/v1/mobile/units` | `MobileUnitController@index` | Retrieve a paginated list of units with aggregated tenant and invoice data.
| GET | `/api/v1/mobile/units/{unit}` | `MobileUnitController@show` | Get detailed information for a single unit, including current tenant and occupancy status.
| GET | `/api/v1/mobile/units/{unit}/invoices` | `MobileUnitController@invoices` | List invoices for the specified unit (optionally filtered by status via query params).
| POST | `/api/v1/mobile/payments` | `MobilePaymentController@store` | Record a payment made from the mobile app. Accepts amount, optional invoice/unit identifiers, and payment method.

## Request / Response Highlights

### `GET /api/v1/mobile/units`
- **Query Parameters** (optional):
  - `property_id` – filter units by a specific property.
  - `property_ids` – comma‑separated list of property IDs for bulk filtering.
- **Response**: JSON array of unit objects, each enriched with:
  - `current_tenant_unit` (tenant details if occupied)
  - `is_occupied` (boolean)
  - `pending_invoices_count`
  - `unpaid_invoices_count`

### `POST /api/v1/mobile/payments`
- **Body (JSON)**:
  ```json
  {
    "amount": 1500.00,
    "payment_method": "credit_card",
    "invoice_id": 123,          // optional
    "unit_id": 45,              // optional if invoice not supplied
    "tenant_unit_id": 78,       // optional, overrides other lookups
    "reference_number": "REF123",
    "transaction_date": "2025-11-25",
    "description": "Rent payment via mobile app"
  }
  ```
- **Response**: Returns the newly created unified payment resource with status `201 Created`.

## Authentication
All mobile routes require a valid Sanctum token. Use the `/api/v1/auth/login` endpoint to obtain a token and include it in the `Authorization: Bearer <token>` header for subsequent requests.

## Recommendations
- **OpenAPI Spec**: Generate an OpenAPI (Swagger) definition for these endpoints to aid client SDK generation.
- **Consistent Error Format**: Ensure all error responses follow a unified JSON schema (e.g., `{ "error": "Message", "code": 422 }`).
- **Rate Limiting**: Mobile endpoints already inherit the global `throttle:60,1` middleware; consider tighter limits for payment creation to mitigate abuse.
- **Versioning**: Continue to version under `v1`; plan for a `v2` when breaking changes are required.

---
*Generated on 2025‑11‑25*
