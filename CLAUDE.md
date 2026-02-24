# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm run dev          # Start dev server (Next.js 16)
pnpm run build        # Production build
pnpm run lint         # ESLint (flat config, eslint 9)
```

Test mode infrastructure exists via `isTestMode()` and `NEXT_PUBLIC_PLAYWRIGHT_TEST` env var. Vitest is available.

## Architecture

**Forma** is an offline-first payroll application for California (CA-only) built with Next.js 16 App Router, Better Auth, MongoDB/Mongoose, and shadcn/ui.

### Stack

- **Auth**: Better Auth with Google OAuth + magic link email (via Resend), MongoDB adapter. Redis (ioredis, Docker) stores magic link tokens. `trustedOrigins` supports Tailscale access via `TAILSCALE_URL` env var. No organization plugin — companies belong directly to users via `userId`.
- **Database**: MongoDB via Mongoose. Cached singleton connection in `lib/db/dbConnect.ts`. Always call `await dbConnect()` before queries in server actions.
- **Styling**: Tailwind CSS 4 (OKLCH colors, dark mode via `.dark` class) + shadcn/ui (new-york style). Use `cn()` from `lib/utils` for class merging.
- **Forms**: React Hook Form + Zod 4 resolvers. Dev mode pre-fills forms via `lib/config/index.ts` defaults.
- **Validation**: Zod schemas in `lib/validation/`. Client schemas use flat field names (for form binding). Server schemas use nested objects (matching MongoDB structure). Actions manually restructure flat→nested.
- **Dates**: `date-fns` v4. Two date formats: `MM/DD/YYYY` for form inputs/DB, `MM-DD-YYYY` for URL params. Use `parseToUTCMidnight()` for payroll date consistency.

### Key Patterns

**Server Actions + Service Layer** (`actions/` → `lib/services/`):
- Actions are thin auth glue: `"use server"` → `withAuth(userId => serviceFunction(userId, ...))` → wraps result
- Return `{ success: true, data }` or `{ success: false, error: string }`
- Service layer (`lib/services/`) owns all DB + business logic. Framework-agnostic, portable to any Node.js backend.
- Service functions take `userId` (not `companyId`) and handle company lookup internally.

**Payroll service** (`lib/services/payroll/`):
- `crud.ts` — single-record operations (create, getById, update)
- `queries.ts` — read operations (table data, company/employee payrolls, preview)
- `reporting.ts` — aggregations (YTD, summaries, recent activity)
- `batch.ts` — multi-record operations (batch create, approve)
- `builders.ts` — shared payroll record builder used by crud.ts and batch.ts
- `types.ts` — shared interfaces (`EmployeeStub`, `PayrollRecordFromDB`)
- Import directly from sub-modules: `@/lib/services/payroll/crud`

**Tax calculations** (`lib/payroll/`):
- Pure calculation functions — no DB access. Federal withholding, CA state taxes, FICA, FUTA, SDI.
- `calculatePayrollTaxesCore` is the single source of truth for all tax calculations.
- Tax rates are year-based: call `getTaxRates(date)` from `lib/constants/tax-rates/` — never use module-level `getTaxRates(new Date())`. Always pass the payroll period date.

**Tax form services** (`lib/services/tax/` → `lib/tax/`):
- Service layer (`lib/services/tax/`) handles DB operations: fetch payrolls, upsert form records, query payments.
- Calc modules (`lib/tax/calc-*.ts`) are pure functions — no DB access. Each mirrors its service: `calc-de9.ts`, `calc-de9c.ts`, `calc941.tsx`, `calc940.tsx`.
- `lib/tax/deadlines.ts` — quarter date ranges, filing deadlines, due dates.
- Tax syncs run in parallel after payroll approval via `actions/payroll.ts` `approvePayrollRecords`.
- Forms: Federal Form 941 (quarterly), Form 940 (annual FUTA), CA DE 9 (quarterly contributions), CA DE 9C (employee wage detail).

**Auth helpers** (`lib/auth/auth-helpers.ts`):
- `getCurrentUser()` — React `cache`-wrapped, safe to call multiple times per request
- `requireAuth()` — throws if not authenticated
- Client-side: `authClient` from `lib/auth/auth-client.ts` exports `signIn`, `signOut`, `useSession`

**MongoDB lean queries**:
- Use `LeanDoc<T>` from `types/db.ts` for typing lean document results (adds `_id: string`)
- When passing lean docs to client components, serialize with `JSON.parse(JSON.stringify(doc))` to strip ObjectId/Date wrappers
- Use `CompanyData` from `types/company.ts` for serialized company data in client components

**Models** (`models/`):
- Each model exports TypeScript interfaces (e.g., `ICompany`, `IEmployee`, `IPayroll`) and a `Document` type
- Employee SSNs: encrypted at rest (AES-256-GCM) with pre-save hooks, SHA-256 hashed for duplicate detection. Access via virtuals `ssnDecrypted`/`ssnMasked`
- Payroll stores denormalized snapshots of employee/tax data at time of processing
- Company: one per user (unique index on `userId`), pay frequency is monthly only

**Environment** (`lib/env.ts`):
- Always use `isDevelopment()`, `isProduction()`, `isTestMode()`, `isBuildTime()` — never read `process.env.NODE_ENV` directly

**Logging** (`lib/logger.ts`):
- Always use `logger` from `lib/logger.ts` — never use `console.log/warn/error` directly.
- `createModuleLogger(name)` for prefixed logging in specific modules.

**Error constants** (`lib/constants/errors.ts`):
- Centralized error messages grouped by domain (AUTH, COMPANY, EMPLOYEE, STATE_RATE, GENERIC)

**Config** (`lib/config/index.ts`):
- `features` — feature flags for test/build behavior
- `defaults` — form pre-fill values (dev only)
- `security` — cookie/origin settings
- `logging` — log level config

### Routing

Route groups in `app/`:
- `(auth)` — unauthenticated: `/sign-in`, `/magic-link`, `/api/auth/[...all]`, `/api/auth/request-magic-link`, `/api/auth/get-magic-code`, `/api/auth/verify-magic-code`
- `(dashboard)` — authenticated with sidebar layout, auth guard in layout via `getCurrentUser()`
- Root `/` — auth check → onboarding (if no company) → redirect to `/overview`

No middleware.ts — auth protection is in layouts and page-level redirects.

### Settings Dialog

Settings is a hash-routed dialog (`#settings/company`, `#settings/state-rates`) managed by `components/company/settings/`. The dialog state syncs with URL hash and supports deep linking. Config in `settings-navigation.tsx`, reducer in `dialog-config.ts`.

### Environment Variables

Required (see `.env.example`): `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `MONGODB_URI`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SSN_ENCRYPTION_KEY` (64-char hex), `REDIS_URL` (default `redis://localhost:6379`), `RESEND_API_KEY`. Optional: `TAILSCALE_URL` for remote access via Tailscale.

## Conventions

- Path alias: `@/*` maps to project root (e.g., `@/lib/utils`, `@/models/company`)
- shadcn/ui components live in `components/ui/`. Use the shadcn MCP server to search/add components.
- No organization/multi-tenant concepts — each user has one company via `userId` on the Company model
- No subscription/billing — this is the offline version
- Pay frequency is monthly only — no biweekly support
