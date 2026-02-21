# Payroll Service Split — Domain Concern Architecture

## Problem

`lib/services/payroll.service.ts` will grow to 15 exported functions (~2000+ lines). Too long to navigate and reason about.

## Solution

Split into `lib/services/payroll/` directory with 5 files grouped by domain concern. Direct sub-module imports (no barrel re-export).

## Directory Structure

```
lib/services/payroll/
  types.ts        — shared interfaces (EmployeeStub, PayrollRecordFromDB)
  crud.ts         — single-record lifecycle (3 functions)
  batch.ts        — multi-record operations (2 functions)
  queries.ts      — read operations (5 functions)
  reporting.ts    — aggregations and summaries (4 functions)
```

## File Contents

### types.ts — Shared interfaces

- `EmployeeStub` — lean employee query shape for payroll calculations
- `PayrollRecordFromDB` — lean payroll record shape for aggregations

### crud.ts — Single-record CRUD (3 functions)

- `createPayrollRecordCore` — create one payroll record with tax calculation
- `getPayrollRecordByIdCore` — fetch a single record by ID
- `updatePayrollRecordCore` — update a record's fields

### batch.ts — Multi-record operations (2 functions)

- `batchCreatePayrollRecordsCore` — create records for multiple employees at once
- `approvePayrollRecordsCore` — approve one or more records (status transition)

### queries.ts — Read operations (5 functions)

- `getPayrollTableDataCore` — payroll page table data (merges employees + existing records)
- `getCompanyPayrollRecordsCore` — all records for a company
- `getPreviewPayrollCore` — preview payroll before creating
- `getEmployeePayrollsCore` — payroll list for one employee
- `getEmployeePayrollDetailsCore` — detailed view for one employee payroll

### reporting.ts — Aggregations and YTD summaries (4 functions)

- `getPayrollYTDCore` — YTD totals for an employee (approved records only)
- `getRecentPayrollActivitiesCore` — recent activities for dashboard
- `getYearlyPayrollSummariesCore` — yearly summaries
- `getYTDNetPayCore` — YTD net pay

## Import Pattern

Consumers import directly from sub-modules:

```ts
import { createPayrollRecordCore } from "@/lib/services/payroll/crud"
import { getPayrollTableDataCore } from "@/lib/services/payroll/queries"
import { getPayrollYTDCore } from "@/lib/services/payroll/reporting"
import { batchCreatePayrollRecordsCore } from "@/lib/services/payroll/batch"
```

## What Stays Where It Is

- `calculatePayrollTaxesCore` stays in `lib/payroll/index.ts` (pure calculation, no DB access)
- `company.service.ts` untouched
- `types/payroll.ts` (client-facing types: `PayrollTableData`, `YTDData`) untouched

## Shared Patterns

Each function independently:
1. Calls `await dbConnect()`
2. Looks up company via `Company.findOne({ userId })`
3. Parses dates with `parseDateParam()`

No shared "context" object — each function is self-contained and portable.

## Migration

Current `payroll.service.ts` has 3 functions to migrate:
- `getPayrollTableDataCore` → `queries.ts`
- `createPayrollRecordCore` → `crud.ts`
- `getPayrollYTDCore` → `reporting.ts`

After migration, delete the old `payroll.service.ts` file.
Update `actions/payroll.ts` imports to point to new sub-modules.
