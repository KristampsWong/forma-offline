---
name: using-types
description: Use when adding, modifying, or importing types in this codebase. Covers the type system architecture — lib/constants/ for primitive union types, models/ for Mongoose interfaces, and types/ for serialized client interfaces.
---

# Using Types

## Architecture

Types live in three layers, each with a distinct purpose:

```
lib/constants/          → Primitive union types + dropdown arrays (single source of truth)
models/                 → Mongoose document interfaces (use Date, ObjectId)
types/                  → Serialized client interfaces (use string for dates/IDs)
```

**Core rule:** All primitive union types (`PayType`, `PayMethod`, `FederalFilingStatus`, etc.) are defined ONLY in `lib/constants/`. Models and types files import from there — never redefine them.

## Layer 1: `lib/constants/` — Primitive Union Types

Defines `as const` arrays (for UI dropdowns) and derives union types from them.

### Files

| File | Types | Arrays |
|------|-------|--------|
| `employment-constants.ts` | `PayType`, `PayMethod`, `PayFrequency`, `EmploymentType`, `EmploymentStatus`, `CompanyType` | `PAY_TYPES`, `PAY_METHODS`, `PAY_FREQUENCIES`, `EMPLOYMENT_TYPES`, `EMPLOYMENT_STATUSES`, `COMPANY_TYPES` |
| `tax-constants.ts` | `FederalFilingStatus`, `StateFilingStatus`, `W4FormVersion`, `WagePlanCode`, `TaxExemption`, `SupportedState` | `FEDERAL_FILING_STATUSES`, `STATE_FILING_STATUSES`, `W4_FORM_VERSIONS`, `WAGE_PLAN_OPTIONS`, `TAX_EXEMPTIONS`, `SUPPORTED_STATES` |
| `index.ts` | Barrel re-export of both files |

### Pattern

```ts
// The const array drives both the UI dropdown and the type
export const PAY_TYPES = [
  { value: "yearly", label: "Yearly" },
  { value: "hourly", label: "Hourly" },
] as const

// Type is derived — always in sync with the array
export type PayType = (typeof PAY_TYPES)[number]["value"]
// Result: "yearly" | "hourly"
```

### How to add a new union type

1. Add the `as const` array in the appropriate constants file
2. Add the derived type export below the array
3. Import from `@/lib/constants` wherever needed — never duplicate the type

```ts
// In lib/constants/employment-constants.ts
export const MY_OPTIONS = [
  { value: "option_a", label: "Option A" },
  { value: "option_b", label: "Option B" },
] as const

export type MyOption = (typeof MY_OPTIONS)[number]["value"]
```

## Layer 2: `models/` — Mongoose Interfaces

Define document interfaces (`IEmployee`, `ICompany`) with `Date` fields and `Types.ObjectId`. These are used server-side only.

```ts
// models/employee.ts
import type { PayType } from "@/lib/constants/employment-constants"     // ← from constants
import type { FederalFilingStatus } from "@/lib/constants/tax-constants" // ← from constants

export interface ICompensation {
  salary: number
  payType: PayType        // ← uses the constant type
  effectiveDate: Date     // ← Date object (server-side)
}
```

**Rules:**
- Import union types from `@/lib/constants/`, never redefine them
- Interfaces use `Date` (not string) and `Types.ObjectId` (not string)
- Export interfaces (e.g., `ICompensation`, `IFederalW4`) for use in services

## Layer 3: `types/` — Serialized Client Interfaces

Define the shapes that server actions return and client components consume. All dates are ISO strings, all IDs are strings.

### Files

| File | Purpose | Exports |
|------|---------|---------|
| `types/employee.ts` | Employee data for client components | `EmployeeListItem`, `EmployeeDetail` |
| `types/company.ts` | Company data for client components | `CompanyData` (= `LeanDoc<ICompany>`) |
| `types/db.ts` | MongoDB lean query utility | `LeanDoc<T>` |

```ts
// types/employee.ts
import type { PayType } from "@/lib/constants/employment-constants"

export interface EmployeeListItem {
  id: string                    // ← string (not ObjectId)
  currentCompensation: {
    salary: number
    payType: PayType            // ← from constants
    effectiveDate: string       // ← ISO string (not Date)
  }
}
```

**Rules:**
- Import union types from `@/lib/constants/`, not from models
- Do NOT re-export types from constants — consumers import directly from `@/lib/constants/`
- Only export interfaces/type aliases that define object shapes

## Import Cheat Sheet

| What you need | Import from |
|---------------|-------------|
| `PayType`, `PayMethod`, `EmploymentStatus`, etc. | `@/lib/constants/employment-constants` |
| `FederalFilingStatus`, `StateFilingStatus`, etc. | `@/lib/constants/tax-constants` |
| Any of the above (shorthand) | `@/lib/constants` (barrel) |
| `PAY_TYPES`, `PAY_METHODS` arrays (for dropdowns) | `@/lib/constants/employment-constants` |
| `FEDERAL_FILING_STATUSES` array (for dropdowns) | `@/lib/constants/tax-constants` |
| `EmployeeDetail`, `EmployeeListItem` | `@/types/employee` |
| `CompanyData` | `@/types/company` |
| `LeanDoc<T>` | `@/types/db` |
| `IEmployee`, `ICompensation`, `IFederalW4` | `@/models/employee` |
| `ICompany`, `IStateRate` | `@/models/company` |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Defining `type PayType = "yearly" \| "hourly"` in a model | Import from `@/lib/constants/employment-constants` |
| Re-exporting constant types from `types/employee.ts` | Don't — consumers import directly from `@/lib/constants/` |
| Using `Date` in a `types/*.ts` interface | Use `string` — these are serialized for client components |
| Using `string` for dates in a `models/*.ts` interface | Use `Date` — models are server-side Mongoose documents |
| Importing types from `@/models/employee` in a component | Import union types from `@/lib/constants/`, interfaces from `@/types/employee` |

## Adding a New Domain

When adding a new model (e.g., Payroll):

1. **Constants** — Add any new union types to `lib/constants/` with `as const` arrays
2. **Model** — Create `models/payroll.ts` with interfaces using `Date` + imported constant types
3. **Client type** — Create `types/payroll.ts` with serialized interfaces using `string` dates + imported constant types
4. **Never** duplicate union types across these layers
