# RentApplicaiton Monorepo

RentApplicaiton pairs a Laravel API with a Next.js frontend to deliver a full-stack rental management platform tailored for Maldivian landlords. This repository keeps both services, shared assets, deployment scripts, and documentation in one place.

## Structure

```
RentApplicaiton/
├── backend/           # Laravel 12 API (PHP 8.3)
├── frontend/          # Next.js 15 App Router UI (JavaScript + Tailwind)
├── packages/          # Reserved for shared UI/components and utilities
├── config/            # CI/CD, Nginx, and deployment templates
├── docs/              # Architecture notes, API contracts, UI guidelines
├── scripts/           # Local/devops helper scripts
├── env/               # Example environment configurations
└── project-plan.md    # Product & delivery plan (kept from project kickoff)
```

## Local Development (Laragon)

1. **Backend**
   ```powershell
   cd backend
   composer install
   php artisan serve
   ```

2. **Frontend**
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

3. **Environment Variables**
   - Duplicate `env/backend.env.example` → `backend/.env`.
   - Duplicate `env/frontend.env.example` → `frontend/.env.local`.

## Next Steps

- Phase 1: Translate `database-schema.sql` into Laravel migrations, seeders, models, and policies. ✅ **COMPLETED**
- Phase 2: Build API endpoints + Sanctum auth and wire the frontend to the backend. ✅ **COMPLETED**
- Phase 3: Implement role-based dashboards, responsive tables/cards, and unified finance views. 🔄 **IN PROGRESS**

## 📚 Documentation

- **API Documentation:** [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) - Complete API reference with endpoints, request/response examples, and authentication details
- **Error Handling Guide:** [`frontend/README-ERROR-HANDLING.md`](frontend/README-ERROR-HANDLING.md) - Error handling components, utilities, and best practices
- **Form Validation Guide:** [`frontend/README-FORM-VALIDATION.md`](frontend/README-FORM-VALIDATION.md) - Client-side form validation system and components
- **Performance Guide:** [`frontend/README-PERFORMANCE.md`](frontend/README-PERFORMANCE.md) - Performance optimizations, caching, and lazy loading
- **Number Generation:** [`docs/NUMBER_GENERATION.md`](docs/NUMBER_GENERATION.md) - Auto-generated invoice/receipt/refund number system
- **Invoice/Receipt Numbers:** [`docs/INVOICE_RECEIPT_NUMBERS.md`](docs/INVOICE_RECEIPT_NUMBERS.md) - Complete review of all numbering systems
- **Rent Invoice System:** [`docs/RENT_INVOICE_SYSTEM.md`](docs/RENT_INVOICE_SYSTEM.md) - Complete guide to how rent invoices work
- **Deployment Guide:** [`docs/DEPLOYMENT_STEP_BY_STEP.md`](docs/DEPLOYMENT_STEP_BY_STEP.md) - Step-by-step deployment instructions
- **Testing Guide (Frontend):** [`frontend/README-TESTING.md`](frontend/README-TESTING.md) - Frontend testing setup and examples
- **Testing Guide (Backend):** [`backend/tests/README.md`](backend/tests/README.md) - Backend testing setup and examples

## 🚀 Deployment

**For step-by-step deployment instructions, see:** [`docs/DEPLOYMENT_STEP_BY_STEP.md`](docs/DEPLOYMENT_STEP_BY_STEP.md)

Quick setup:
1. Follow the complete guide in `docs/DEPLOYMENT_STEP_BY_STEP.md`
2. Set up GitHub Secrets (SSH_PRIVATE_KEY, SSH_USER, SSH_HOST)
3. Push to `main` branch to trigger automatic deployment

Refer to `project-plan.md` for the complete roadmap. Additional documentation, diagrams, and ADRs should live inside `docs/`.

