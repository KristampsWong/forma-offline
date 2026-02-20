# Payroll Service Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split `lib/services/payroll.service.ts` into domain-focused sub-modules under `lib/services/payroll/`.

**Architecture:** Move existing 3 functions into their target files (crud, queries, reporting). Create empty batch.ts for future functions. Direct sub-module imports — no barrel re-export.

**Tech Stack:** TypeScript, Mongoose, Next.js App Router

---

### Task 1: Create shared types file

**Files:**
- Create: `lib/services/payroll/types.ts`

**Step 1: Create the types file**

Extract `EmployeeStub` and `PayrollRecordFromDB` interfaces from current `payroll.service.ts` into the shared types file:

```ts
import type {
  EmploymentStatus,
  PayFrequency,
  PayMethod,
  PayType,
} from "@/lib/constants/employment-constants"
import type { ICompensation } from "@/models/employee"

export interface EmployeeStub {
  _id: string
  firstName: string
  lastName: string
  currentSalary: number
  payType: PayType
  currentPayMethod: PayMethod
  employmentStatus: EmploymentStatus
  currentWorkingHours: number
  hireDate: Date
  terminationDate?: Date
  compensationHistory: ICompensation[]
}

export interface PayrollRecordFromDB {
  _id: string
  employeeId: string
  employeeInfo: { firstName: string; lastName: string }
  hoursWorked?: { totalHours: number }
  compensation: { payType: string; payRate: number }
  earnings: {
    regularPay: number
    overtimePay: number
    commissionPay: number
    otherPay: number
    totalGrossPay: number
  }
  deductions: {
    preTax: { total: number }
    taxes: {
      federalIncomeTax: number
      socialSecurityTax: number
      medicareTax: number
      stateIncomeTax: number
      sdi: number
    }
    postTax: { total: number }
  }
  employerTaxes: {
    socialSecurityTax: number
    medicareTax: number
    futa: number
    sui: number
    ett: number
  }
  netPay: number
  approvalStatus: string
}
```

**Step 2: Commit**

```bash
git add lib/services/payroll/types.ts
git commit -m "refactor: extract payroll service shared types"
```

---

### Task 2: Create reporting.ts (move getPayrollYTDCore)

**Why reporting first:** `crud.ts` depends on `getPayrollYTDCore` (called inside `createPayrollRecordCore` at line 275), so reporting must exist before crud.

**Files:**
- Create: `lib/services/payroll/reporting.ts`

**Step 1: Create reporting.ts**

Move `getPayrollYTDCore` from `payroll.service.ts`. Update imports to use shared types:

```ts
import dbConnect from "@/lib/db/dbConnect"
import Company from "@/models/company"
import Employee from "@/models/employee"
import Payroll from "@/models/payroll"
import { parseDateParam, getYearDateRange } from "@/lib/date/utils"
import type { YTDData } from "@/types/payroll"
import type { PayrollRecordFromDB } from "@/lib/services/payroll/types"

// Paste getPayrollYTDCore function body exactly as-is from payroll.service.ts lines 394-496
```

**Step 2: Commit**

```bash
git add lib/services/payroll/reporting.ts
git commit -m "refactor: move getPayrollYTDCore to payroll/reporting"
```

---

### Task 3: Create crud.ts (move createPayrollRecordCore)

**Files:**
- Create: `lib/services/payroll/crud.ts`

**Step 1: Create crud.ts**

Move `createPayrollRecordCore` from `payroll.service.ts`. Key change — import `getPayrollYTDCore` from sibling module:

```ts
import dbConnect from "@/lib/db/dbConnect"
import Company from "@/models/company"
import Employee from "@/models/employee"
import Payroll from "@/models/payroll"
import { parseDateParam } from "@/lib/date/utils"
import { calculateHours, calculateGrossPay, calculatePayrollTaxesCore } from "@/lib/payroll"
import { getPayrollYTDCore } from "@/lib/services/payroll/reporting"

// Paste createPayrollRecordCore function body exactly as-is from payroll.service.ts lines 188-388
```

**Step 2: Commit**

```bash
git add lib/services/payroll/crud.ts
git commit -m "refactor: move createPayrollRecordCore to payroll/crud"
```

---

### Task 4: Create queries.ts (move getPayrollTableDataCore)

**Files:**
- Create: `lib/services/payroll/queries.ts`

**Step 1: Create queries.ts**

Move `getPayrollTableDataCore` from `payroll.service.ts`:

```ts
import dbConnect from "@/lib/db/dbConnect"
import type { PayFrequency } from "@/lib/constants/employment-constants"
import Company from "@/models/company"
import Employee from "@/models/employee"
import Payroll from "@/models/payroll"
import { parseDateParam } from "@/lib/date/utils"
import { calculatePayrollForEmployee } from "@/lib/payroll"
import type { PayrollTableData } from "@/types/payroll"
import type { EmployeeStub, PayrollRecordFromDB } from "@/lib/services/payroll/types"

// Paste getPayrollTableDataCore function body exactly as-is from payroll.service.ts lines 69-186
```

**Step 2: Commit**

```bash
git add lib/services/payroll/queries.ts
git commit -m "refactor: move getPayrollTableDataCore to payroll/queries"
```

---

### Task 5: Create empty batch.ts

**Files:**
- Create: `lib/services/payroll/batch.ts`

**Step 1: Create placeholder**

```ts
// Placeholder for batch payroll operations:
// - batchCreatePayrollRecordsCore
// - approvePayrollRecordsCore
```

**Step 2: Commit**

```bash
git add lib/services/payroll/batch.ts
git commit -m "refactor: add payroll/batch placeholder"
```

---

### Task 6: Update actions/payroll.ts imports

**Files:**
- Modify: `actions/payroll.ts`

**Step 1: Update imports**

Change:
```ts
import {
  getPayrollTableDataCore,
  createPayrollRecordCore,
} from "@/lib/services/payroll.service"
```

To:
```ts
import { createPayrollRecordCore } from "@/lib/services/payroll/crud"
import { getPayrollTableDataCore } from "@/lib/services/payroll/queries"
```

**Step 2: Commit**

```bash
git add actions/payroll.ts
git commit -m "refactor: update payroll action imports to new sub-modules"
```

---

### Task 7: Search for any other imports of old payroll.service path

**Step 1: Search codebase**

```bash
grep -r "payroll.service" --include="*.ts" --include="*.tsx" lib/ actions/ app/ components/
```

Update any remaining imports found.

**Step 2: Delete old file**

```bash
rm lib/services/payroll.service.ts
```

**Step 3: Commit**

```bash
git add -u
git commit -m "refactor: delete old payroll.service.ts"
```

---

### Task 8: Build verification

**Step 1: Run build**

```bash
pnpm run build
```

Expected: Build succeeds with no import errors.

**Step 2: Run lint**

```bash
pnpm run lint
```

Expected: No new lint errors.

**Step 3: Final commit (if any lint fixes needed)**

```bash
git add -A
git commit -m "refactor: fix lint issues from payroll service split"
```
