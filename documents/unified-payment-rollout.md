# Unified Payment Flow – Testing & Rollout Plan

## Testing Strategy

### Backend
- **Unit tests**
  - `UnifiedPaymentService` covering creation per `payment_type`, status transitions, and error paths.
  - Validation rules via `StoreUnifiedPaymentRequestTest` to ensure conditional requirements per type.
  - Mapping helpers (e.g., status normalization) with edge cases.
- **Feature tests**
  - `POST /api/v1/payments` happy paths for rent, maintenance, and security refund.
  - Failure cases: missing tenant unit, invalid amount, forbidden payment method, status transition violations.
  - `POST /api/v1/payments/{id}/capture` & `/void` for both native entries and legacy-linked records.
  - `GET /api/v1/payments` filtering by type, flow, status, date range, `entry_origin`.
- **Regression**
  - Ensure existing routes (`financial-records`, `rent-invoices`, `security-deposit-refunds`) still return expected payloads while unified flow is in feature-flag “off” state.

### Frontend
- **Component tests (Vitest/RTL)**
  - `PaymentTypeSelector` selection logic & analytics events.
  - Form validation for required fields per payment type (rent, maintenance, refund).
  - API error handling (422 validation messages, network errors).
- **Integration tests (Playwright)**
  - End-to-end happy path: select rent payment → fill details → review → submit → success toast → redirect to ledger entry.
  - Outgoing payment flow with vendor info, verifying review summary accuracy.
  - Retry path when backend returns validation error (e.g., duplicate reference number).
- **Visual regression**
  - Capture baseline screenshots for desktop/mobile layouts of each wizard step.

### Manual QA Checklist
- Create payments for each type and confirm they appear in ledger with correct filters.
- Capture/void operations reflect in both unified page and underlying legacy record (when applicable).
- Permission checks: delegate users without proper policy should receive 403.
- Verify localization/currency formatting for non-default currency landlords.
- Accessibility: keyboard navigation through wizard, focus management after step transitions.

## Rollout Steps
1. **Feature flag**: wrap new endpoints and frontend route behind `UNIFIED_PAYMENTS_ENABLED`.
2. **Migrational deployment**
   - Deploy migrations (new table + view updates) in maintenance window.
   - Backfill `unified_payment_entries` where staged data exists.
   - Run smoke tests on staging to confirm ledger still loads.
3. **Staging verification**
   - QA executes manual checklist using seeded data.
   - Integrate with payment gateway sandbox if applicable.
4. **Progressive release**
   - Enable feature flag for internal team accounts first.
   - Monitor logs (`unified_payment_entries`, error rates, API response times).
   - Gradually expand to pilot landlords, then general availability.
5. **Parallel support**
   - Keep legacy creation flows documented; add banner in old pages redirecting to unified flow.
   - Schedule deprecation timeline once adoption >90%.
6. **Monitoring & Observability**
   - Add structured logs for `PaymentCreated`, `PaymentCaptured`, `PaymentVoided`.
   - Configure alerts on capture failure rate and API latency spikes.
   - Dashboard metrics: total payments by type, error counts, time-to-capture.
7. **Post-launch**
   - Collect feedback from users after first week.
   - Iterate on UI/UX improvements (saved templates, bulk actions) based on telemetry.

