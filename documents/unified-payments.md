# Unified Payment Collection API Plan

## Current State
- `unified_payments` database view consolidates `financial_records` (rent income & maintenance expenses) and `security_deposit_refunds` into a read-only projection.
- `UnifiedPaymentController@index` exposes a paginated report (`GET /api/v1/reports/unified-payments`) with filtering, but there is no write endpoint or consistent creation flow.
- Separate controllers (`FinancialRecordController`, `SecurityDepositRefundController`, `MaintenanceInvoiceController`, `RentInvoiceController`) handle creation/update with divergent validation, payloads, and status vocabularies.
- Identified gaps: no single entry point to create payments, status enums differ across tables, and the current view uses overlapping `id` namespaces which makes updates/joins fragile.

## Objectives
1. Allow staff to create any payment (incoming or outgoing) from one API endpoint that the new frontend page can call.
2. Preserve existing specialized flows (rent invoices, maintenance, security refunds) while funneling shared logic through a unified service layer.
3. Standardize payment metadata: type, flow direction, status, amount, counterparties, references.
4. Provide pathways for marking payments as paid/voided and attaching supporting data (e.g., invoices, refund receipts).
5. Enable gradual rollout by leaving existing routes intact until the unified flow replaces them.

## Proposed Data Contract
```json
{
  "payment_type": "rent|maintenance|security_refund|fee|other_income|other_outgoing",
  "flow_direction": "income|outgoing",
  "tenant_unit_id": 123,
  "amount": 1500.00,
  "currency": "USD",
  "description": "November rent",
  "due_date": "2025-11-01",
  "transaction_date": "2025-11-05",
  "status": "draft|pending|scheduled|completed|partial|cancelled|failed|refunded",
  "payment_method": "Bank Transfer",
  "reference_number": "INV-2025-11-0001",
  "metadata": {
    "source_type": "rent_invoice",
    "source_id": 456,
    "attachments": [],
    "notes": "Paid via ACH"
  }
}
```
- `currency` defaults to landlord’s preferred currency when omitted.
- `metadata.source_type/source_id` allow linking to legacy tables during transition.
- Enforce status vocabulary across all payment sources.

## Backend Refactors
- **New table** `unified_payment_entries` (write model) with columns mirroring the contract above plus `landlord_id`, `created_by`, timestamps, soft deletes.
- **Updated view** `unified_payments` to union:
  - `unified_payment_entries`
  - legacy `financial_records` (rent, fees, expenses) with mapped status/type
  - `security_deposit_refunds`
  - future: `subscription_invoices`
  - Add computed columns `source_type`, `source_id`, `entry_origin` (`legacy|native`), and synthetic `composite_id = CONCAT(source_type, ':', id)`
- **Service layer** `UnifiedPaymentService` orchestrating creation per type: forwards to legacy controller/service or writes directly to `unified_payment_entries`.
- **Normalization helpers** for status mapping (e.g., rent invoice `paid` → unified `completed`).
- **Policies**: extend `UnifiedPaymentPolicy` to cover create/update/capture/void operations.

## API Surface
| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/v1/payments` | Replaces current report endpoint with new resource name, supports same filters plus `entry_origin` and `source_type`. |
| `POST` | `/api/v1/payments` | Create a unified payment; validates payload, dispatches to appropriate handler, returns `UnifiedPaymentResource`. |
| `POST` | `/api/v1/payments/{composite_id}/capture` | Mark payment as completed; optionally set transaction date and reference. |
| `POST` | `/api/v1/payments/{composite_id}/void` | Cancel or reverse a payment; updates underlying source if applicable. |
| `PATCH` | `/api/v1/payments/{composite_id}` | Update editable fields (status, due date, metadata). |
| `GET` | `/api/v1/payments/{composite_id}` | Detailed view including related tenant/unit, attachments, history. |

Implementation notes:
- Maintain compatibility alias `GET /api/v1/reports/unified-payments` → new index route for existing consumers.
- `composite_id` resolves to `source_type` + underlying id; service translates to actual model.

## Validation & Error Handling
- Central FormRequest: `StoreUnifiedPaymentRequest` with conditional rules per `payment_type`.
- Inject `PaymentTypeDefinition` registry describing required fields, default values, and allowed transitions.
- Raise domain exceptions for invalid transitions (e.g., capturing a voided payment) and map to 422/409 responses.

## Migration Strategy
1. Create new table and service; seed `payment_types` config.
2. Backfill `unified_payment_entries` with non-rent/maintenance payments if any custom records exist.
3. Update view & resource to expose `composite_id`, `source_type`, `entry_origin`.
4. Adjust frontend GET to use new shape while backend still supports legacy flows.
5. Implement POST/capture/void endpoints with feature flag.
6. Gradually update legacy creation flows to call the unified service, then deprecate redundant endpoints.

## Testing Approach
- Unit tests for `UnifiedPaymentService` by payment type.
- Feature tests for new endpoints (create, capture, void, filtering).
- Regression tests ensuring existing `financial_records`/`security_deposit_refunds` routes continue to function during rollout.
- Contract tests shared with frontend to lock payload shapes.

