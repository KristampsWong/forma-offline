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
- **Styling**: Tailwind CSS 4 + shadcn/ui (new-york style). Use `cn()` from `lib/utils` for class merging.
- **Forms**: React Hook Form + Zod resolvers. Dev mode pre-fills forms via `lib/config/index.ts` defaults.
- **Validation**: Zod schemas in `lib/validation/`. Client schemas (flat) and server schemas (nested) are separate.

### Key Patterns

**Server Actions** (`actions/`):
- Use `"use server"` directive
- Authenticate with `requireAuth()` from `lib/auth/auth-helpers.ts`
- Validate input with Zod schemas from `lib/validation/`
- Return `{ success: true }` or `{ success: false, error: string }`

**Auth helpers** (`lib/auth/auth-helpers.ts`):
- `getCurrentUser()` — React `cache`-wrapped, safe to call multiple times per request
- `requireAuth()` — throws if not authenticated

**MongoDB lean queries**:
- Use `LeanDoc<T>` from `types/db.ts` for typing lean document results (adds `_id: string`)
- Example: `Company.findOne({...}).lean<LeanDoc<ICompany>>()`

**Models** (`models/`):
- Each model exports explicit TypeScript interfaces (e.g., `ICompany`, `IEmployee`, `IPayroll`) and a `Document` type
- Employee SSNs are encrypted at rest (AES-256-GCM) with pre-save hooks; use virtual fields `ssnDecrypted`/`ssnMasked` for access
- Payroll stores denormalized snapshots of employee/tax data at time of processing

**Environment** (`lib/env.ts`):
- Always use `isDevelopment()`, `isProduction()`, `isTestMode()`, `isBuildTime()` — never read `process.env.NODE_ENV` directly

**Error constants** (`lib/constants/errors.ts`):
- Centralized error messages grouped by domain (AUTH, COMPANY, EMPLOYEE, etc.)

### Routing

Route groups in `app/`:
- `(auth)` — unauthenticated: `/sign-in`, `/api/auth/[...all]`
- `(dashboard)` — authenticated with sidebar layout: `/overview`, `/payroll`, `/employees`, etc.
- Root `/` — redirects based on auth state and onboarding status

### Environment Variables

Required (see `.env.example`): `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `MONGODB_URI`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Also needs `SSN_ENCRYPTION_KEY` (64-char hex).

## Conventions

- Path alias: `@/*` maps to project root (e.g., `@/lib/utils`, `@/models/company`)
- shadcn/ui components live in `components/ui/`. Use the shadcn MCP server to search/add components.
- No organization/multi-tenant concepts — each user has one company via `userId` on the Company model
