# Database ENUM Columns Report

**Generated:** 2025-11-22 22:42:07  
**Total ENUM Columns:** 31  
**Total Tables with ENUM:** 20

---

## Summary

This report lists all ENUM columns found in the database. ENUM columns are useful for fixed-value sets but can be limiting when values need to change dynamically or when integrating with reference tables.

---

## ENUM Columns by Table

### 1. `asset_types`
- **category** (NOT NULL, Default: 'appliance')
  - Values: `appliance`, `furniture`, `electronic`, `fixture`, `other`

### 2. `assets`
- **ownership** (NOT NULL, Default: 'landlord')
  - Values: `landlord`, `tenant`
- **status** (NOT NULL, Default: 'working')
  - Values: `working`, `maintenance`, `broken`

### 3. `email_templates`
- **type** (NULLABLE, Default: NULL)
  - Values: `rent_due`, `rent_received`, `maintenance_request`, `lease_expiry`, `security_deposit`, `system`

### 4. `financial_records`
- **category** (NOT NULL, Default: NULL)
  - Values: `monthly_rent`, `late_fee`, `processing_fee`, `maintenance`, `repair`, `utility`, `tax`, `insurance`, `management_fee`, `other`
- **status** (NOT NULL, Default: 'completed')
  - Values: `pending`, `completed`, `cancelled`, `overdue`, `partial`
- **type** (NOT NULL, Default: NULL)
  - Values: `rent`, `expense`, `security_deposit`, `refund`, `fee`

### 5. `landlords`
- **subscription_tier** (NOT NULL, Default: 'basic')
  - Values: `basic`, `pro`, `enterprise`

### 6. `maintenance_invoices`
- **status** (NOT NULL, Default: 'draft')
  - Values: `draft`, `sent`, `approved`, `paid`, `overdue`, `cancelled`

### 7. `maintenance_requests`
- **type** (NOT NULL, Default: 'repair')
  - Values: `repair`, `replacement`, `service`

### 8. `notifications`
- **priority** (NOT NULL, Default: 'medium')
  - Values: `low`, `medium`, `high`, `urgent`
- **sent_via** (NOT NULL, Default: 'in_app')
  - Values: `in_app`, `email`, `sms`, `all`
- **type** (NOT NULL, Default: NULL)
  - Values: `rent_due`, `rent_received`, `maintenance_request`, `lease_expiry`, `security_deposit`, `system`

### 9. `properties`
- **type** (NOT NULL, Default: 'residential')
  - Values: `residential`, `commercial`

### 10. `rent_invoices` ⚠️
- **payment_method** (NULLABLE, Default: NULL)
  - Values: `cash`, `bank_transfer`, `upi`, `card`, `cheque`
  - **⚠️ RECOMMENDATION:** Consider migrating to VARCHAR to match `payment_methods.name` structure
- **status** (NOT NULL, Default: 'generated')
  - Values: `generated`, `sent`, `paid`, `overdue`, `cancelled`

### 11. `security_deposit_refunds` ⚠️
- **payment_method** (NULLABLE, Default: NULL)
  - Values: `bank_transfer`, `cheque`, `cash`, `upi`
  - **⚠️ RECOMMENDATION:** Consider migrating to VARCHAR to match `payment_methods.name` structure
- **status** (NOT NULL, Default: 'pending')
  - Values: `pending`, `processed`, `cancelled`

### 12. `sms_templates`
- **type** (NULLABLE, Default: NULL)
  - Values: `rent_due`, `rent_received`, `maintenance_request`, `lease_expiry`, `security_deposit`, `system`

### 13. `subscription_invoices`
- **status** (NOT NULL, Default: 'pending')
  - Values: `paid`, `pending`, `overdue`, `void`

### 14. `subscription_limits`
- **tier** (NOT NULL, Default: NULL)
  - Values: `basic`, `pro`, `enterprise`

### 15. `telegram_templates`
- **parse_mode** (NOT NULL, Default: 'None')
  - Values: `Markdown`, `HTML`, `None`
- **type** (NULLABLE, Default: NULL)
  - Values: `rent_due`, `rent_received`, `maintenance_request`, `lease_expiry`, `security_deposit`, `system`

### 16. `tenant_units`
- **status** (NOT NULL, Default: 'active')
  - Values: `active`, `ended`, `cancelled`

### 17. `tenants`
- **id_proof_type** (NULLABLE, Default: NULL)
  - Values: `national_id`, `passport`
- **status** (NOT NULL, Default: 'active')
  - Values: `active`, `inactive`, `former`

### 18. `unified_payment_entries`
- **flow_direction** (NOT NULL, Default: NULL)
  - Values: `income`, `outgoing`
- **payment_type** (NOT NULL, Default: NULL)
  - Values: `rent`, `maintenance_expense`, `security_refund`, `fee`, `other_income`, `other_outgoing`
- **status** (NOT NULL, Default: 'draft')
  - Values: `draft`, `pending`, `scheduled`, `completed`, `partial`, `cancelled`, `failed`, `refunded`

### 19. `unit_occupancy_history`
- **action** (NOT NULL, Default: NULL)
  - Values: `move_in`, `move_out`

### 20. `users`
- **role** (NULLABLE, Default: 'owner')
  - Values: `owner`, `admin`, `manager`, `agent`, `super_admin`

---

## Migration Recommendations

### High Priority

1. **`rent_invoices.payment_method`**
   - **Current:** ENUM('cash','bank_transfer','upi','card','cheque')
   - **Recommendation:** Migrate to VARCHAR(120) to match `payment_methods.name` structure
   - **Reason:** Already have a `payment_methods` table that should be the source of truth
   - **Status:** ⚠️ Needs migration

2. **`security_deposit_refunds.payment_method`**
   - **Current:** ENUM('bank_transfer','cheque','cash','upi')
   - **Recommendation:** Migrate to VARCHAR(120) to match `payment_methods.name` structure
   - **Reason:** Already have a `payment_methods` table that should be the source of truth
   - **Status:** ⚠️ Needs migration

### Note
- `financial_records.payment_method` has already been migrated from ENUM to VARCHAR ✅

---

## ENUM Usage Analysis

### Appropriate ENUM Usage (Keep as ENUM)
These columns represent fixed, system-defined states that are unlikely to change:
- Status fields (e.g., `pending`, `completed`, `cancelled`)
- Type fields with fixed business logic (e.g., `rent`, `expense`, `refund`)
- System roles (e.g., `owner`, `admin`, `manager`)
- Boolean-like choices (e.g., `income`/`outgoing`, `move_in`/`move_out`)

### Consider Migration to VARCHAR/Reference Table
These columns might benefit from being migrated to reference tables or VARCHAR:
- `payment_method` columns (already have `payment_methods` table)
- Categories that might expand (e.g., `asset_types.category`)
- Template types that might be user-configurable

---

## Quick Reference Table

| Table | Column | Type | Nullable | Default | Values Count |
|-------|--------|------|----------|---------|--------------|
| asset_types | category | enum | NO | appliance | 5 |
| assets | ownership | enum | NO | landlord | 2 |
| assets | status | enum | NO | working | 3 |
| email_templates | type | enum | YES | NULL | 6 |
| financial_records | category | enum | NO | NULL | 10 |
| financial_records | status | enum | NO | completed | 5 |
| financial_records | type | enum | NO | NULL | 5 |
| landlords | subscription_tier | enum | NO | basic | 3 |
| maintenance_invoices | status | enum | NO | draft | 6 |
| maintenance_requests | type | enum | NO | repair | 3 |
| notifications | priority | enum | NO | medium | 4 |
| notifications | sent_via | enum | NO | in_app | 4 |
| notifications | type | enum | NO | NULL | 6 |
| properties | type | enum | NO | residential | 2 |
| rent_invoices | payment_method | enum | YES | NULL | 5 |
| rent_invoices | status | enum | NO | generated | 5 |
| security_deposit_refunds | payment_method | enum | YES | NULL | 4 |
| security_deposit_refunds | status | enum | NO | pending | 3 |
| sms_templates | type | enum | YES | NULL | 6 |
| subscription_invoices | status | enum | NO | pending | 4 |
| subscription_limits | tier | enum | NO | NULL | 3 |
| telegram_templates | parse_mode | enum | NO | None | 3 |
| telegram_templates | type | enum | YES | NULL | 6 |
| tenant_units | status | enum | NO | active | 3 |
| tenants | id_proof_type | enum | YES | NULL | 2 |
| tenants | status | enum | NO | active | 3 |
| unified_payment_entries | flow_direction | enum | NO | NULL | 2 |
| unified_payment_entries | payment_type | enum | NO | NULL | 6 |
| unified_payment_entries | status | enum | NO | draft | 8 |
| unit_occupancy_history | action | enum | NO | NULL | 2 |
| users | role | enum | YES | owner | 5 |

---

## Notes

- All ENUM columns are properly indexed where appropriate
- Most ENUM columns have sensible default values
- Payment method columns should be migrated to use the `payment_methods` reference table
- Status and type ENUMs are generally appropriate for their use cases

