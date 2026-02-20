# Tax Rates & Tax Tables Update Guide

> **Last Updated:** 2025-12-12
>
> **Current Tax Year:** 2025

## Overview

This document explains how to update tax rates and tax tables when new annual values are published by the IRS and California EDD.

## Architecture

```
lib/constants/
├── tax-rates/                    # Tax rate constants (SS, Medicare, FUTA, SDI, etc.)
│   ├── index.ts                  # getTaxRates() factory function
│   ├── types.ts                  # Type definitions
│   ├── 2025.ts                   # 2025 tax rates
│   └── README.md                 # This file
│
└── tax-table/                    # Withholding tax brackets
    ├── index.ts                  # Unified exports
    ├── federal/
    │   ├── index.ts              # getFederalTaxTables() factory
    │   ├── types.ts              # Federal tax table types
    │   └── 2025.ts               # 2025 federal withholding brackets
    └── california/
        ├── index.ts              # getCaliforniaTaxTables() factory
        ├── types.ts              # California tax table types
        └── 2025.ts               # 2025 CA withholding brackets
```

## Files That Use Tax Rates

### Core Payroll Calculation

| File | Usage | Notes |
|------|-------|-------|
| `lib/payroll.ts` | All tax calculation functions | Uses `getTaxRates()` and tax tables |
| `actions/payroll/payroll-calculate.ts` | `calculateTaxesCore()`, `calculatePayrollTaxesInternal()` | Gets `taxRates` from `payPeriodStartDate` |

### Form Calculations (941, 940, DE9)

| File | Usage | Notes |
|------|-------|-------|
| `lib/calc941.tsx` | Social Security wage base, SS rate, Medicare rate, Medicare threshold | Form 941 quarterly calculations |
| `lib/calc940.tsx` | FUTA limit, FUTA net rate, FUTA credit rate, deposit threshold | Form 940 annual calculations |
| `actions/taxes/de9-read.ts` | SDI rate, SUI limit | California DE9 quarterly calculations |
| `actions/taxes/taxfilling-sync.ts` | CA FUTA credit reduction rate | Tax filing sync |
| `app/api/forms/fill940/route.ts` | CA FUTA credit reduction rate | PDF form filling |

## How Tax Rates Are Selected

Tax rates are selected based on the **pay period start date**:

```typescript
// In calculatePayrollTaxesInternal()
const taxRates = getTaxRates(payPeriodStartDate)
```

The `getTaxRates()` function extracts the year from the date and returns the corresponding tax rates:

```typescript
export function getTaxRates(payPeriodStartDate: string | Date): TaxRates {
  const date = typeof payPeriodStartDate === "string"
    ? new Date(payPeriodStartDate)
    : payPeriodStartDate
  const year = date.getUTCFullYear()

  // Returns rates for the year, or falls back to most recent available
  return taxRatesByYear[year] ?? taxRatesByYear[mostRecentYear]
}
```

---

## Updating Tax Rates for a New Year (e.g., 2026)

### Step 1: Create the New Tax Rates File

Create `lib/constants/tax-rates/2026.ts`:

```typescript
import type { TaxRates } from "./types"

export const taxRates2026: TaxRates = {
  year: 2026,
  federal: {
    // Social Security (check IRS Publication 15)
    socialSecurityWageBase: 000000,  // UPDATE: SS wage base for 2026
    socialSecurityRate: 0.062,        // Usually stays at 6.2%

    // Medicare (check IRS Publication 15)
    medicareRate: 0.0145,             // Usually stays at 1.45%
    medicareAdditionalRate: 0.009,    // Usually stays at 0.9%
    medicareAdditionalThreshold: 200000, // Usually stays at $200k

    // FUTA (check IRS Form 940 instructions)
    futaLimit: 7000,                  // Usually stays at $7,000
    futaGrossRate: 0.06,              // Usually stays at 6.0%
    futaCreditRate: 0.054,            // Usually stays at 5.4%
    futaNetRate: 0.006,               // Usually stays at 0.6%
    futaQuarterlyDepositThreshold: 500, // Usually stays at $500

    // W-4 Standard Deductions (check IRS Publication 15-T)
    standardDeduction: {
      single: 0000,                   // UPDATE: from Pub 15-T
      marriedJointly: 00000,          // UPDATE: from Pub 15-T
      headOfHousehold: 0000,          // UPDATE: from Pub 15-T
    },
  },
  california: {
    // SDI (check EDD website for new rate)
    sdiRate: 0.000,                   // UPDATE: CA SDI rate for 2026

    // UI/ETT limits (usually stay at $7,000)
    suiLimit: 7000,
    ettLimit: 7000,

    // FUTA Credit Reduction (check if CA is still a credit reduction state)
    futaCreditReductionRate: 0.000,   // UPDATE: check IRS Schedule A (Form 940)
  },
}
```

### Step 2: Register in the Index File

Update `lib/constants/tax-rates/index.ts`:

```typescript
import { taxRates2025 } from "./2025"
import { taxRates2026 } from "./2026"  // ADD THIS

const taxRatesByYear: Record<number, TaxRates> = {
  2025: taxRates2025,
  2026: taxRates2026,  // ADD THIS
}
```

### Step 3: Update the TaxYear Type

Update `lib/constants/tax-rates/types.ts`:

```typescript
export type TaxYear = 2025 | 2026 | 2027  // ADD 2027 for next year
```

---

## Updating Tax Tables for a New Year (e.g., 2026)

Tax tables contain the withholding brackets used to calculate federal and state income tax withholding.

### Step 1: Create Federal Tax Tables

Create `lib/constants/tax-rates/tax-table/federal/2026.ts`:

```typescript
import type { FederalTaxTables } from "./types"

/**
 * 2026 Federal Withholding Tax Tables
 * Source: IRS Publication 15-T (2026)
 */
export const federalTaxTables2026: FederalTaxTables = {
  year: 2026,

  // Standard tables (Step 2 NOT checked on W-4)
  single: [
    { min: 0, max: 6925, tentativeAmount: 0, rate: 0.00 },
    // ... copy structure from 2025.ts and update values
  ],
  marriedJointly: [
    // ... update values from Pub 15-T
  ],
  headOfHousehold: [
    // ... update values from Pub 15-T
  ],

  // Step 2 tables (Step 2 IS checked on W-4)
  singleStep2Checked: [
    // ... update values from Pub 15-T
  ],
  marriedJointlyStep2Checked: [
    // ... update values from Pub 15-T
  ],
  headOfHouseholdStep2Checked: [
    // ... update values from Pub 15-T
  ],
}
```

### Step 2: Create California Tax Tables

Create `lib/constants/tax-rates/tax-table/california/2026.ts`:

```typescript
import type { CaliforniaTaxTables } from "./types"

/**
 * 2026 California Withholding Tax Tables
 * Source: California EDD Publication DE 44 (2026)
 */
export const californiaTaxTables2026: CaliforniaTaxTables = {
  year: 2026,

  lowIncomeExemption: {
    single: { annual: 00000, monthly: 0000, biweekly: 000, weekly: 000 },
    married: { annual: 00000, monthly: 0000, biweekly: 000, weekly: 000 },
    headOfHousehold: { annual: 00000, monthly: 0000, biweekly: 000, weekly: 000 },
  },

  standardDeduction: {
    single: { annual: 0000, monthly: 000, biweekly: 000, weekly: 000 },
    married: { annual: 0000, monthly: 000, biweekly: 000, weekly: 000 },
    headOfHousehold: { annual: 0000, monthly: 000, biweekly: 000, weekly: 000 },
  },

  estimatedDeduction: {
    // ... update values from DE 44
  },

  exemptionAllowance: {
    // ... update values from DE 44
  },

  taxBrackets: {
    monthly: {
      single: [
        // ... update from DE 44
      ],
      married: [
        // ... update from DE 44
      ],
      headOfHousehold: [
        // ... update from DE 44
      ],
    },
    biweekly: {
      // ... update from DE 44
    },
  },
}
```

### Step 3: Register Tax Tables

Update `lib/constants/tax-rates/tax-table/federal/index.ts`:

```typescript
import { federalTaxTables2025 } from "./2025"
import { federalTaxTables2026 } from "./2026"  // ADD THIS

const federalTaxTablesByYear: Record<number, FederalTaxTables> = {
  2025: federalTaxTables2025,
  2026: federalTaxTables2026,  // ADD THIS
}
```

Update `lib/constants/tax-rates/tax-table/california/index.ts`:

```typescript
import { californiaTaxTables2025 } from "./2025"
import { californiaTaxTables2026 } from "./2026"  // ADD THIS

const californiaTaxTablesByYear: Record<number, CaliforniaTaxTables> = {
  2025: californiaTaxTables2025,
  2026: californiaTaxTables2026,  // ADD THIS
}
```

---

## Reference Sources

### Federal Tax Rates

| Item | Source | Typical Release |
|------|--------|-----------------|
| Social Security Wage Base | IRS Publication 15 | October-November |
| Federal Withholding Tables | IRS Publication 15-T | December |
| FUTA Rates | IRS Form 940 Instructions | Late year |
| Credit Reduction States | IRS Schedule A (Form 940) | November |

### California Tax Rates

| Item | Source | Typical Release |
|------|--------|-----------------|
| SDI Rate | EDD Website | October-November |
| State Withholding Tables | EDD Publication DE 44 | December |
| UI/ETT Wage Limits | EDD Website | Late year |

---

## Testing After Updates

After updating tax rates, run:

```bash
# Type check
pnpm build

# Run tests
pnpm test

# Verify specific payroll calculations manually
```

## Checklist for Annual Update

- [ ] Check IRS Publication 15 for SS wage base
- [ ] Check IRS Publication 15-T for federal withholding tables
- [ ] Check IRS Form 940 instructions for FUTA rates
- [ ] Check IRS Schedule A (Form 940) for credit reduction states
- [ ] Check EDD website for CA SDI rate
- [ ] Check EDD Publication DE 44 for CA withholding tables
- [ ] Create new year's tax rates file
- [ ] Create new year's federal tax tables file
- [ ] Create new year's California tax tables file
- [ ] Register all new files in respective index.ts files
- [ ] Update TaxYear type
- [ ] Run build and tests
- [ ] Update this README with new "Last Updated" date
