# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm run dev          # Start dev server (Next.js 16)
pnpm run build        # Production build
pnpm run lint         # ESLint (flat config, eslint 9)
```

No test framework is configured yet. Test mode infrastructure exists via `isTestMode()` and `NEXT_PUBLIC_PLAYWRIGHT_TEST` env var.

## Architecture

**Forma** is an offline-first payroll application for California (CA-only) built with Next.js 16 App Router, Better Auth, MongoDB/Mongoose, and shadcn/ui.

### Stack

- **Auth**: Better Auth with Google OAuth, MongoDB adapter. No organization plugin — companies belong directly to users via `userId`.
- **Database**: MongoDB via Mongoose. Cached singleton connection in `lib/db/dbConnect.ts`. Always call `await dbConnect()` before queries in server actions.
- **Styling**: Tailwind CSS 4 (OKLCH colors, dark mode via `.dark` class) + shadcn/ui (new-york style). Use `cn()` from `lib/utils` for class merging.
- **Forms**: React Hook Form + Zod 4 resolvers. Dev mode pre-fills forms via `lib/config/index.ts` defaults.
- **Validation**: Zod schemas in `lib/validation/`. Client schemas use flat field names (for form binding). Server schemas use nested objects (matching MongoDB structure). Actions manually restructure flat→nested.
- **Dates**: `date-fns` v4. Two date formats: `MM/DD/YYYY` for form inputs/DB, `MM-DD-YYYY` for URL params. Use `parseToUTCMidnight()` for payroll date consistency.

### Key Patterns

**Server Actions** (`actions/`):
- `"use server"` → `requireAuth()` → Zod validate → `await dbConnect()` → query/mutate
- Return `{ success: true }` or `{ success: false, error: string }`

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

**Error constants** (`lib/constants/errors.ts`):
- Centralized error messages grouped by domain (AUTH, COMPANY, EMPLOYEE, STATE_RATE, GENERIC)

**Config** (`lib/config/index.ts`):
- `features` — feature flags for test/build behavior
- `defaults` — form pre-fill values (dev only)
- `security` — cookie/origin settings
- `logging` — log level config

### Routing

Route groups in `app/`:
- `(auth)` — unauthenticated: `/sign-in`, `/api/auth/[...all]`
- `(dashboard)` — authenticated with sidebar layout, auth guard in layout via `getCurrentUser()`
- Root `/` — auth check → onboarding (if no company) → redirect to `/overview`

No middleware.ts — auth protection is in layouts and page-level redirects.

### Settings Dialog

Settings is a hash-routed dialog (`#settings/company`, `#settings/state-rates`) managed by `components/company/settings/`. The dialog state syncs with URL hash and supports deep linking. Config in `settings-navigation.tsx`, reducer in `dialog-config.ts`.

### Environment Variables

Required (see `.env.example`): `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `MONGODB_URI`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Also needs `SSN_ENCRYPTION_KEY` (64-char hex).

## Conventions

- Path alias: `@/*` maps to project root (e.g., `@/lib/utils`, `@/models/company`)
- shadcn/ui components live in `components/ui/`. Use the shadcn MCP server to search/add components.
- No organization/multi-tenant concepts — each user has one company via `userId` on the Company model
- No subscription/billing — this is the offline version
- Pay frequency is monthly only — no biweekly support
