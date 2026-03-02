# Edit & Approve Statement Transactions — Design

## Overview

Allow users to edit AI-extracted transactions in the statement import detail page via a dialog, then approve all transactions to copy them as `Expense` records.

## Data Flow

1. AI extracts → transactions stored in `StatementImport.transactions[]` (temporary)
2. User edits individual transactions via `ExpenseFormDialog` (updates `StatementImport.transactions[]` in-place)
3. User clicks "Approve All" → bulk-creates `Expense` records, sets status to `"confirmed"`

## Components

### StatementTransactionsTable

- Add **Edit button** per row: opens `ExpenseFormDialog` pre-filled with transaction data. On save, calls `updateStatementTransaction` action, updates local state (no page refresh).
- Add **"Approve All" button** in footer: calls `confirmStatementImport` action. Once confirmed, hide edit buttons and approve button.
- Needs `categories` prop (for the dialog's category dropdown) and `importId`.

### ExtractPanel

- Pass `categories` and `importId` through to the table.
- After confirm, update local status to `"confirmed"`.

### Page (`/expenses/import/[id]`)

- Fetch categories server-side and pass to `ExtractPanel`.

## Server Actions (`actions/statementimports.ts`)

### `updateStatementTransaction(importId, index, data)`

- Updates a single transaction by array index in `StatementImport.transactions[]`
- `data`: `{ date, categoryId, description, amount }` (matches ExpenseFormDialog output)
- Returns updated `StatementTransaction` (with resolved categoryName)

### `confirmStatementImport(importId)`

- Validates status is `"ready"`
- Bulk-creates `Expense` records from all transactions (with `statementImportId` link)
- Sets status to `"confirmed"`
- Revalidates `/expenses` path

## Service Layer

### `updateTransactionInImport()` in `lib/services/expenses/extraction.ts`

- Finds import, validates index, updates transaction fields, saves

### `confirmStatementImportCore()` in `lib/services/expenses/extraction.ts`

- Finds import with status `"ready"`
- Creates `Expense` records via `Expense.insertMany()` with `statementImportId`
- Sets status to `"confirmed"`

## Decisions

- **Edit via dialog** (reuse `ExpenseFormDialog`) — not inline editing
- **Approve all at once** — no per-row selection
- **Status → "confirmed"** after approval — import preserved for reference
