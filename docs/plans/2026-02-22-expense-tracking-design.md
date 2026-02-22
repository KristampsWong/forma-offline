# Expense Tracking Feature Design

**Date**: 2026-02-22
**Status**: Approved

## Overview

Add expense tracking to Forma with user-defined categories, CRUD operations, and two report views. Two top-level routes: `/expenses` for data entry and `/reports` for analytics.

## Data Models

### ExpenseCategory (`models/expense-category.ts`)

| Field | Type | Notes |
|-------|------|-------|
| companyId | ObjectId (ref Company) | Indexed |
| name | String | e.g. "Office Supplies" |
| createdAt / updatedAt | Date | Mongoose timestamps |

Unique compound index: `{ companyId: 1, name: 1 }`

### Expense (`models/expense.ts`)

| Field | Type | Notes |
|-------|------|-------|
| companyId | ObjectId (ref Company) | Indexed |
| categoryId | ObjectId (ref ExpenseCategory) | Links to category |
| date | Date | Stored as UTC midnight |
| description | String | What was purchased |
| amount | Number | In dollars (e.g. 149.99) |
| vendor | String (optional) | Who it was paid to |
| notes | String (optional) | Additional details |
| createdAt / updatedAt | Date | Mongoose timestamps |

Index: `{ companyId: 1, date: -1 }`

### Date Handling

All dates stored as `Date` (UTC) in MongoDB using `parseToUTCMidnight()`. Display converted to `MM/DD/YYYY` on client. URL params use `MM-DD-YYYY` format.

## Pages

### `/expenses` — Expense List Page

- **Summary cards**: Total expenses (for selected date range), entry count, top category by spend
- **Filters**: Date range picker, category dropdown (from categories table)
- **Data table**: Date, Category, Description, Vendor, Amount. Edit/delete per row.
- **"Add Expense" button**: Opens dialog with expense form
- **"Manage Categories" button**: Opens dialog to add/rename/delete categories

#### Expense Form (dialog)

- Date (date input, defaults to today)
- Category (select dropdown from categories table)
- Description (text input)
- Amount (number input)
- Vendor (optional text input)
- Notes (optional textarea)

#### Category Management (dialog)

- List of existing categories with rename/delete actions
- Input + add button at top to create new categories
- Delete blocked if category has expenses (shows count)

### `/reports` — Reports Page

- **Summary by category**: Table — Category, Total, % of Total, Count. Grand total row. Date range filter.
- **Monthly breakdown**: Grid — Categories as rows, months as columns. Year selector.

## Backend Architecture

### Service Layer (`lib/services/expenses/`)

- `crud.ts` — create/update/delete expense, create/rename/delete category
- `queries.ts` — list expenses (with filters), list categories, get single expense
- `reporting.ts` — summary by category (date range), monthly breakdown (by year)
- `types.ts` — shared interfaces

All service functions take `userId` (not `companyId`) and look up company internally.

### Server Actions (`actions/expenses.ts`)

Thin auth glue following existing pattern: `requireAuth()` -> delegate to service with `user.id` -> wrap result in `{ success, data }` or `{ success: false, error }`.

### Validation (`lib/validation/expense-schema.ts`)

- `createExpenseSchema` / `updateExpenseSchema` — date, categoryId, description, amount, vendor?, notes?
- `createCategorySchema` / `renameCategorySchema` — name

### Error Constants

Add `EXPENSE_ERRORS` and `EXPENSE_CATEGORY_ERRORS` to `lib/constants/errors.ts`.

### Types (`types/expense.ts`)

- `ExpenseListItem` — serialized expense for table (with category name populated)
- `ExpenseCategoryItem` — serialized category
- `ExpenseSummaryByCategory` — category name, total, percentage, count
- `MonthlyBreakdownRow` — category name + 12 month columns

## Navigation

Update sidebar to add `/reports` link under the Accounting section alongside existing `/expenses`.

## Key Behaviors

- Categories are per-company, managed via dialog on expenses page
- Cannot delete a category that has expenses referencing it
- Category dropdown on expense form pulls from categories table
- Reports aggregate by categoryId with populated category names
