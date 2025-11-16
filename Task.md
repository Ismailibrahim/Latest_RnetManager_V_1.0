# Project Status Overview

## Completed
- Backend APIs spanning properties, units, tenants, leases, finances, maintenance, assets, notifications, security deposit refunds, unit occupancy history, and unified payments (with validation, policies, resources, routes, docs, and passing feature tests).
- Database layer: migrations, factories, seeders, and the SQLite/MySQL-compatible `unified_payments` view.
- Documentation: `docs/api/properties-units.md` covers all implemented endpoints including reporting.
- Frontend baseline: Next.js layout shell, theme setup, sidebar/topbar scaffolding.
- Authentication & authorization: Sanctum login flow, landlord context middleware, seeded roles, and policies.
- Repo scaffolding: mono-repo structure, environment templates, README, and `.gitignore`.

## Pending
- GitHub/CI-CD setup (`.github/workflows/deploy.yml`, server `deploy.sh`, secrets configuration).
- Deployment pipeline execution on the VPS.
- Building full React feature screens consuming the APIs.
- Phase-2 integrations (payments, messaging, document storage, etc.).

