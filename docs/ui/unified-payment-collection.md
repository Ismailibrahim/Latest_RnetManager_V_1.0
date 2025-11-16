# Unified Payment Collection Page – Frontend Outline

## Page Location
- New route: `frontend/app/(dashboard)/payments/collect/page.jsx`
- Linked from existing `Unified payments` ledger (`/app/(dashboard)/unified-payments`) via “Collect payment” CTA.

## Page Goals
1. Allow staff to initiate any payment type (rent, maintenance expense, refund, fee, other income/outgoing) from a single workflow.
2. Provide contextual data (tenant/unit details, outstanding balances, historical payments) to reduce context switching.
3. Offer a guided, multi-step experience with validation feedback, review confirmation, and status indicators.

## High-Level UX Flow
1. **Payment type selection**
   - Card grid of supported payment types (incoming vs outgoing) with explanatory copy.
   - Optional quick actions (e.g., “Start from rent invoice”).
2. **Details form**
   - Common fields: tenant/unit selector, amount, due date, payment method, reference, notes.
   - Conditional sections per type (e.g., late fee toggle for rent, vendor info for maintenance, refund breakdown).
   - Inline fetches for supporting data:
     - Tenant units via `/tenant-units?include=tenant,unit`.
     - Outstanding rent invoices via `/rent-invoices?status=pending`.
     - Maintenance requests for linking via `/maintenance-requests`.
3. **Review & confirmation**
   - Summary panel listing key fields, flow direction badge, total amount.
   - Ability to go back and edit.
   - Submit button triggers API call and shows optimistic state (loading spinner, success/failure alert).
4. **Post-submit**
   - Success: show receipt info (transaction date, reference) with CTA to view ledger entry (links to `/unified-payments` filtered by new composite id).
   - Failure: display error message with retry option.

## Component Breakdown
- `PaymentTypeSelector` – cards with icons, copy, and exposes `onSelect(type)`.
- `TenantUnitField` – search-as-you-type dropdown hitting `/tenant-units` (can reuse existing combos from tenant pages once extracted).
- `AmountField` – currency input with formatting, optional calculator for rent + fees.
- `PaymentMethodSelect` – uses `usePaymentMethods` hook to load options.
- `ConditionalSections`:
  - `RentPaymentFields` – outstanding invoices list with quick fill, late fee toggle.
  - `MaintenanceExpenseFields` – vendor lookup (from maintenance request), tax/discount inputs.
  - `SecurityRefundFields` – original deposit, deductions repeater.
  - `GenericMetadataFields` – tags, attachments, internal notes.
- `ReviewCard` – templated summary showing amount, flow direction, counterparties.
- `SubmissionToast` – standard success/error feedback (reuse pattern from other forms).

## State & Data Management
- Use `useReducer` or `zustand`-style local store to track multi-step form state (keep within page to avoid extra dependencies).
- Step navigation guard: prevent advancing when validation fails.
- API integration via `fetch` with auth token (consistent with existing pages). Wrap calls in helper `createUnifiedPayment(payload)`.
- Keep derived values (net refund amount, outstanding balance) in selectors to avoid recomputation across steps.

## Validation Strategy
- Client-side: inline checks using zod/yup (if introducing new dependency) or manual validators; ensure parity with backend `StoreUnifiedPaymentRequest`.
- Display errors beneath fields and prevent submission until resolved.
- When backend returns validation errors, map JSON keys to form fields and surface inline + summary alert.

## Loading & Error States
- Skeleton placeholders for tenant/unit search dropdowns.
- Empty state copy when no outstanding invoices/requests.
- Global error boundary to catch fetch failures (e.g., token missing, network issues).

## Responsive Layout Considerations
- Two-column layout on desktop (form on left, contextual sidebar on right).
- Single column on mobile with sticky step progress indicator.
- Use existing tailwind utility patterns from other dashboard pages for consistency.

## Supporting Assets
- Icon set: reuse lucide icons already available (`ArrowDownCircle`, `ArrowUpCircle`, `RefreshCcw`).
- Copywriting: align with ledger page tone (clear, actionable).
- Add feature flag wrapper (e.g., environment variable) if backend route gated.

