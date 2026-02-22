# Expense Tracking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add expense tracking with user-defined categories, CRUD, and two report views (`/expenses` and `/reports`).

**Architecture:** Two Mongoose models (ExpenseCategory, Expense). Service layer in `lib/services/expenses/` with crud, queries, reporting modules. Server actions in `actions/expenses.ts` using `withAuth` pattern. Two dashboard pages.

**Tech Stack:** Next.js 16 App Router, Mongoose, Zod 4, React Hook Form, shadcn/ui, date-fns

---

### Task 1: Error Constants

**Files:**
- Modify: `lib/constants/errors.ts`

**Step 1: Add expense error constants**

Add before the `GENERIC_ERRORS` block:

```typescript
/**
 * Expense Category Errors
 */
export const EXPENSE_CATEGORY_ERRORS = {
  NOT_FOUND: "Expense category not found",
  ALREADY_EXISTS: "A category with this name already exists",
  FAILED_TO_CREATE: "Failed to create expense category",
  FAILED_TO_UPDATE: "Failed to update expense category",
  HAS_EXPENSES: "Cannot delete category that has expenses",
} as const

/**
 * Expense Errors
 */
export const EXPENSE_ERRORS = {
  NOT_FOUND: "Expense not found",
  FAILED_TO_CREATE: "Failed to create expense",
  FAILED_TO_UPDATE: "Failed to update expense",
  FAILED_TO_DELETE: "Failed to delete expense",
  INVALID_AMOUNT: "Amount must be greater than 0",
  INVALID_DATE: "Invalid expense date",
  CATEGORY_NOT_FOUND: "Expense category not found",
} as const
```

Add to the `ERRORS` combined export:

```typescript
export const ERRORS = {
  AUTH: AUTH_ERRORS,
  SUBSCRIPTION: SUBSCRIPTION_ERRORS,
  COMPANY: COMPANY_ERRORS,
  EMPLOYEE: EMPLOYEE_ERRORS,
  PAYROLL: PAYROLL_ERRORS,
  STATE_RATE: STATE_RATE_ERRORS,
  EXPENSE_CATEGORY: EXPENSE_CATEGORY_ERRORS,
  EXPENSE: EXPENSE_ERRORS,
  GENERIC: GENERIC_ERRORS,
} as const
```

**Step 2: Commit**

```bash
git add lib/constants/errors.ts
git commit -m "feat(expenses): add error constants for expense and category"
```

---

### Task 2: ExpenseCategory Model

**Files:**
- Create: `models/expense-category.ts`

**Step 1: Create the model**

```typescript
import mongoose, { type Document, type Model, Schema, type Types } from "mongoose"

export interface IExpenseCategory {
  companyId: Types.ObjectId
  name: string
  createdAt: Date
  updatedAt: Date
}

export type ExpenseCategoryDocument = IExpenseCategory & Document

const ExpenseCategorySchema = new Schema<ExpenseCategoryDocument>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
)

// Unique compound index: no duplicate category names per company
ExpenseCategorySchema.index({ companyId: 1, name: 1 }, { unique: true })

const ExpenseCategory =
  (mongoose.models.ExpenseCategory as Model<ExpenseCategoryDocument>) ||
  mongoose.model<ExpenseCategoryDocument>("ExpenseCategory", ExpenseCategorySchema)

export default ExpenseCategory
```

**Step 2: Commit**

```bash
git add models/expense-category.ts
git commit -m "feat(expenses): add ExpenseCategory mongoose model"
```

---

### Task 3: Expense Model

**Files:**
- Create: `models/expense.ts`

**Step 1: Create the model**

```typescript
import mongoose, { type Document, type Model, Schema, type Types } from "mongoose"

export interface IExpense {
  companyId: Types.ObjectId
  categoryId: Types.ObjectId
  date: Date
  description: string
  amount: number
  vendor?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export type ExpenseDocument = IExpense & Document

const ExpenseSchema = new Schema<ExpenseDocument>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    vendor: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
)

// Compound index for date-range queries per company
ExpenseSchema.index({ companyId: 1, date: -1 })

const Expense =
  (mongoose.models.Expense as Model<ExpenseDocument>) ||
  mongoose.model<ExpenseDocument>("Expense", ExpenseSchema)

export default Expense
```

**Step 2: Commit**

```bash
git add models/expense.ts
git commit -m "feat(expenses): add Expense mongoose model"
```

---

### Task 4: Client Types

**Files:**
- Create: `types/expense.ts`

**Step 1: Create client-facing types**

```typescript
/** Serialized expense category for client components */
export interface ExpenseCategoryItem {
  _id: string
  name: string
  createdAt: string
  updatedAt: string
}

/** Serialized expense for table/list display */
export interface ExpenseListItem {
  _id: string
  categoryId: string
  categoryName: string
  date: string
  description: string
  amount: number
  vendor?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

/** Summary row for category report */
export interface ExpenseSummaryByCategory {
  categoryId: string
  categoryName: string
  total: number
  count: number
  percentage: number
}

/** Row for monthly breakdown report */
export interface MonthlyBreakdownRow {
  categoryId: string
  categoryName: string
  months: number[] // 12 entries, index 0 = January
  total: number
}
```

**Step 2: Commit**

```bash
git add types/expense.ts
git commit -m "feat(expenses): add client-facing expense types"
```

---

### Task 5: Validation Schemas

**Files:**
- Create: `lib/validation/expense-schema.ts`

**Step 1: Create Zod schemas**

```typescript
import { z } from "zod/v4"

// ============================================================================
// Category Schemas
// ============================================================================

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(50, "Category name too long"),
})

export const renameCategorySchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
  name: z.string().min(1, "Category name is required").max(50, "Category name too long"),
})

// ============================================================================
// Expense Schemas (client — flat field names for form binding)
// ============================================================================

export const createExpenseSchema = z.object({
  date: z.string().min(1, "Date is required"),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required").max(200, "Description too long"),
  amount: z.string().min(1, "Amount is required"),
  vendor: z.string().max(100, "Vendor name too long").optional().or(z.literal("")),
  notes: z.string().max(500, "Notes too long").optional().or(z.literal("")),
})

export const updateExpenseSchema = z.object({
  expenseId: z.string().min(1, "Expense ID is required"),
  date: z.string().min(1, "Date is required"),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required").max(200, "Description too long"),
  amount: z.string().min(1, "Amount is required"),
  vendor: z.string().max(100, "Vendor name too long").optional().or(z.literal("")),
  notes: z.string().max(500, "Notes too long").optional().or(z.literal("")),
})

// ============================================================================
// Inferred Types
// ============================================================================

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type RenameCategoryInput = z.infer<typeof renameCategorySchema>
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>
```

**Step 2: Commit**

```bash
git add lib/validation/expense-schema.ts
git commit -m "feat(expenses): add Zod validation schemas for expenses and categories"
```

---

### Task 6: Service Layer — Types

**Files:**
- Create: `lib/services/expenses/types.ts`

**Step 1: Create service-layer types**

```typescript
/** Shape returned by lean queries for expense list (with populated category) */
export interface ExpenseFromDB {
  _id: string
  companyId: string
  categoryId: {
    _id: string
    name: string
  }
  date: Date
  description: string
  amount: number
  vendor?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

/** Shape returned by lean queries for categories */
export interface ExpenseCategoryFromDB {
  _id: string
  companyId: string
  name: string
  createdAt: Date
  updatedAt: Date
}
```

**Step 2: Commit**

```bash
git add lib/services/expenses/types.ts
git commit -m "feat(expenses): add service layer types"
```

---

### Task 7: Service Layer — CRUD

**Files:**
- Create: `lib/services/expenses/crud.ts`

**Step 1: Create CRUD service**

```typescript
/**
 * Expense & Category CRUD operations
 *
 * Functions:
 * - createCategoryCore(userId, name)
 * - renameCategoryCore(userId, categoryId, name)
 * - deleteCategoryCore(userId, categoryId)
 * - createExpenseCore(userId, data)
 * - updateExpenseCore(userId, expenseId, data)
 * - deleteExpenseCore(userId, expenseId)
 */

import dbConnect from "@/lib/db/dbConnect"
import Company from "@/models/company"
import ExpenseCategory from "@/models/expense-category"
import Expense from "@/models/expense"
import { COMPANY_ERRORS, EXPENSE_CATEGORY_ERRORS, EXPENSE_ERRORS } from "@/lib/constants/errors"
import { parseToUTCMidnight } from "@/lib/date/utils"
import type { ExpenseCategoryItem, ExpenseListItem } from "@/types/expense"
import { extractDateOnly } from "@/lib/date/utils"

async function getCompanyId(userId: string): Promise<string> {
  const company = await Company.findOne({ userId }).lean()
  if (!company) throw new Error(COMPANY_ERRORS.NOT_FOUND)
  return company._id.toString()
}

// ============================================================================
// Category CRUD
// ============================================================================

export async function createCategoryCore(
  userId: string,
  name: string
): Promise<ExpenseCategoryItem> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  // Check for duplicate name
  const existing = await ExpenseCategory.findOne({ companyId, name: name.trim() }).lean()
  if (existing) throw new Error(EXPENSE_CATEGORY_ERRORS.ALREADY_EXISTS)

  const category = await ExpenseCategory.create({
    companyId,
    name: name.trim(),
  })

  return {
    _id: category._id.toString(),
    name: category.name,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  }
}

export async function renameCategoryCore(
  userId: string,
  categoryId: string,
  name: string
): Promise<ExpenseCategoryItem> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  // Check for duplicate name (excluding current category)
  const existing = await ExpenseCategory.findOne({
    companyId,
    name: name.trim(),
    _id: { $ne: categoryId },
  }).lean()
  if (existing) throw new Error(EXPENSE_CATEGORY_ERRORS.ALREADY_EXISTS)

  const category = await ExpenseCategory.findOneAndUpdate(
    { _id: categoryId, companyId },
    { $set: { name: name.trim() } },
    { new: true }
  ).lean()

  if (!category) throw new Error(EXPENSE_CATEGORY_ERRORS.NOT_FOUND)

  return {
    _id: category._id.toString(),
    name: category.name,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  }
}

export async function deleteCategoryCore(
  userId: string,
  categoryId: string
): Promise<{ deleted: true }> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  // Check if category has expenses
  const expenseCount = await Expense.countDocuments({ companyId, categoryId })
  if (expenseCount > 0) throw new Error(EXPENSE_CATEGORY_ERRORS.HAS_EXPENSES)

  const result = await ExpenseCategory.findOneAndDelete({ _id: categoryId, companyId })
  if (!result) throw new Error(EXPENSE_CATEGORY_ERRORS.NOT_FOUND)

  return { deleted: true }
}

// ============================================================================
// Expense CRUD
// ============================================================================

export async function createExpenseCore(
  userId: string,
  data: {
    date: string
    categoryId: string
    description: string
    amount: string
    vendor?: string
    notes?: string
  }
): Promise<ExpenseListItem> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  // Validate category belongs to this company
  const category = await ExpenseCategory.findOne({ _id: data.categoryId, companyId }).lean()
  if (!category) throw new Error(EXPENSE_ERRORS.CATEGORY_NOT_FOUND)

  // Parse date to UTC
  const parsedDate = parseToUTCMidnight(data.date)
  if (!parsedDate) throw new Error(EXPENSE_ERRORS.INVALID_DATE)

  const amount = parseFloat(data.amount)
  if (isNaN(amount) || amount <= 0) throw new Error(EXPENSE_ERRORS.INVALID_AMOUNT)

  const expense = await Expense.create({
    companyId,
    categoryId: data.categoryId,
    date: parsedDate,
    description: data.description.trim(),
    amount,
    vendor: data.vendor?.trim() || undefined,
    notes: data.notes?.trim() || undefined,
  })

  return {
    _id: expense._id.toString(),
    categoryId: category._id.toString(),
    categoryName: category.name,
    date: extractDateOnly(expense.date) ?? "",
    description: expense.description,
    amount: expense.amount,
    vendor: expense.vendor,
    notes: expense.notes,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  }
}

export async function updateExpenseCore(
  userId: string,
  expenseId: string,
  data: {
    date: string
    categoryId: string
    description: string
    amount: string
    vendor?: string
    notes?: string
  }
): Promise<ExpenseListItem> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  // Validate category belongs to this company
  const category = await ExpenseCategory.findOne({ _id: data.categoryId, companyId }).lean()
  if (!category) throw new Error(EXPENSE_ERRORS.CATEGORY_NOT_FOUND)

  const parsedDate = parseToUTCMidnight(data.date)
  if (!parsedDate) throw new Error(EXPENSE_ERRORS.INVALID_DATE)

  const amount = parseFloat(data.amount)
  if (isNaN(amount) || amount <= 0) throw new Error(EXPENSE_ERRORS.INVALID_AMOUNT)

  const expense = await Expense.findOneAndUpdate(
    { _id: expenseId, companyId },
    {
      $set: {
        categoryId: data.categoryId,
        date: parsedDate,
        description: data.description.trim(),
        amount,
        vendor: data.vendor?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      },
    },
    { new: true }
  ).lean()

  if (!expense) throw new Error(EXPENSE_ERRORS.NOT_FOUND)

  return {
    _id: expense._id.toString(),
    categoryId: category._id.toString(),
    categoryName: category.name,
    date: extractDateOnly(expense.date) ?? "",
    description: expense.description,
    amount: expense.amount,
    vendor: expense.vendor,
    notes: expense.notes,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  }
}

export async function deleteExpenseCore(
  userId: string,
  expenseId: string
): Promise<{ deleted: true }> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  const result = await Expense.findOneAndDelete({ _id: expenseId, companyId })
  if (!result) throw new Error(EXPENSE_ERRORS.NOT_FOUND)

  return { deleted: true }
}
```

**Step 2: Commit**

```bash
git add lib/services/expenses/crud.ts
git commit -m "feat(expenses): add expense and category CRUD service"
```

---

### Task 8: Service Layer — Queries

**Files:**
- Create: `lib/services/expenses/queries.ts`

**Step 1: Create query service**

```typescript
/**
 * Expense & Category query operations
 *
 * Functions:
 * - getCategoriesCore(userId)
 * - getExpensesCore(userId, filters)
 * - getExpenseByIdCore(userId, expenseId)
 */

import dbConnect from "@/lib/db/dbConnect"
import Company from "@/models/company"
import ExpenseCategory from "@/models/expense-category"
import Expense from "@/models/expense"
import { COMPANY_ERRORS } from "@/lib/constants/errors"
import { extractDateOnly } from "@/lib/date/utils"
import type { ExpenseCategoryItem, ExpenseListItem } from "@/types/expense"
import type { ExpenseFromDB, ExpenseCategoryFromDB } from "./types"

async function getCompanyId(userId: string): Promise<string> {
  const company = await Company.findOne({ userId }).lean()
  if (!company) throw new Error(COMPANY_ERRORS.NOT_FOUND)
  return company._id.toString()
}

export async function getCategoriesCore(
  userId: string
): Promise<ExpenseCategoryItem[]> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  const categories = await ExpenseCategory.find({ companyId })
    .sort({ name: 1 })
    .lean<ExpenseCategoryFromDB[]>()

  return categories.map((cat) => ({
    _id: cat._id.toString(),
    name: cat.name,
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
  }))
}

export async function getExpensesCore(
  userId: string,
  filters?: {
    startDate?: Date
    endDate?: Date
    categoryId?: string
  }
): Promise<ExpenseListItem[]> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  // Build query
  const query: Record<string, unknown> = { companyId }

  if (filters?.startDate || filters?.endDate) {
    query.date = {}
    if (filters.startDate) (query.date as Record<string, Date>).$gte = filters.startDate
    if (filters.endDate) (query.date as Record<string, Date>).$lte = filters.endDate
  }

  if (filters?.categoryId) {
    query.categoryId = filters.categoryId
  }

  const expenses = await Expense.find(query)
    .populate("categoryId", "name")
    .sort({ date: -1 })
    .lean<ExpenseFromDB[]>()

  return expenses.map((exp) => ({
    _id: exp._id.toString(),
    categoryId: exp.categoryId._id.toString(),
    categoryName: exp.categoryId.name,
    date: extractDateOnly(exp.date) ?? "",
    description: exp.description,
    amount: exp.amount,
    vendor: exp.vendor,
    notes: exp.notes,
    createdAt: exp.createdAt.toISOString(),
    updatedAt: exp.updatedAt.toISOString(),
  }))
}
```

**Step 2: Commit**

```bash
git add lib/services/expenses/queries.ts
git commit -m "feat(expenses): add expense and category query service"
```

---

### Task 9: Service Layer — Reporting

**Files:**
- Create: `lib/services/expenses/reporting.ts`

**Step 1: Create reporting service**

```typescript
/**
 * Expense reporting and aggregation
 *
 * Functions:
 * - getExpenseSummaryByCategoryCore(userId, startDate, endDate)
 * - getMonthlyBreakdownCore(userId, year)
 * - getExpenseTotalsCore(userId, startDate?, endDate?) — for summary cards
 */

import dbConnect from "@/lib/db/dbConnect"
import Company from "@/models/company"
import ExpenseCategory from "@/models/expense-category"
import Expense from "@/models/expense"
import { COMPANY_ERRORS } from "@/lib/constants/errors"
import type { ExpenseSummaryByCategory, MonthlyBreakdownRow } from "@/types/expense"
import type { ExpenseCategoryFromDB } from "./types"

async function getCompanyId(userId: string): Promise<string> {
  const company = await Company.findOne({ userId }).lean()
  if (!company) throw new Error(COMPANY_ERRORS.NOT_FOUND)
  return company._id.toString()
}

export interface ExpenseTotals {
  totalAmount: number
  count: number
  topCategory: { name: string; total: number } | null
}

export async function getExpenseTotalsCore(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ExpenseTotals> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  const match: Record<string, unknown> = { companyId }
  if (startDate || endDate) {
    match.date = {}
    if (startDate) (match.date as Record<string, Date>).$gte = startDate
    if (endDate) (match.date as Record<string, Date>).$lte = endDate
  }

  const result = await Expense.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$categoryId",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ])

  if (result.length === 0) {
    return { totalAmount: 0, count: 0, topCategory: null }
  }

  const totalAmount = result.reduce((sum, r) => sum + r.total, 0)
  const totalCount = result.reduce((sum, r) => sum + r.count, 0)

  // Get top category name
  const topCatDoc = await ExpenseCategory.findById(result[0]._id).lean()

  return {
    totalAmount,
    count: totalCount,
    topCategory: topCatDoc ? { name: topCatDoc.name, total: result[0].total } : null,
  }
}

export async function getExpenseSummaryByCategoryCore(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<ExpenseSummaryByCategory[]> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  const result = await Expense.aggregate([
    {
      $match: {
        companyId,
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$categoryId",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ])

  if (result.length === 0) return []

  const grandTotal = result.reduce((sum, r) => sum + r.total, 0)

  // Get category names
  const categoryIds = result.map((r) => r._id)
  const categories = await ExpenseCategory.find({ _id: { $in: categoryIds } })
    .lean<ExpenseCategoryFromDB[]>()
  const catMap = new Map(categories.map((c) => [c._id.toString(), c.name]))

  return result.map((r) => ({
    categoryId: r._id.toString(),
    categoryName: catMap.get(r._id.toString()) ?? "Unknown",
    total: r.total,
    count: r.count,
    percentage: grandTotal > 0 ? Math.round((r.total / grandTotal) * 10000) / 100 : 0,
  }))
}

export async function getMonthlyBreakdownCore(
  userId: string,
  year: number
): Promise<MonthlyBreakdownRow[]> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  const startDate = new Date(Date.UTC(year, 0, 1))
  const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))

  const result = await Expense.aggregate([
    {
      $match: {
        companyId,
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          categoryId: "$categoryId",
          month: { $month: "$date" },
        },
        total: { $sum: "$amount" },
      },
    },
  ])

  if (result.length === 0) return []

  // Get all category names
  const categoryIds = [...new Set(result.map((r) => r._id.categoryId.toString()))]
  const categories = await ExpenseCategory.find({ _id: { $in: categoryIds } })
    .lean<ExpenseCategoryFromDB[]>()
  const catMap = new Map(categories.map((c) => [c._id.toString(), c.name]))

  // Build rows: one per category, 12 month columns
  const rowMap = new Map<string, MonthlyBreakdownRow>()

  for (const r of result) {
    const catId = r._id.categoryId.toString()
    if (!rowMap.has(catId)) {
      rowMap.set(catId, {
        categoryId: catId,
        categoryName: catMap.get(catId) ?? "Unknown",
        months: Array(12).fill(0),
        total: 0,
      })
    }
    const row = rowMap.get(catId)!
    const monthIndex = r._id.month - 1 // MongoDB $month is 1-indexed
    row.months[monthIndex] = r.total
    row.total += r.total
  }

  return Array.from(rowMap.values()).sort((a, b) => b.total - a.total)
}
```

**Step 2: Commit**

```bash
git add lib/services/expenses/reporting.ts
git commit -m "feat(expenses): add expense reporting service"
```

---

### Task 10: Server Actions

**Files:**
- Create: `actions/expenses.ts`

**Step 1: Create server actions**

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { withAuth } from "@/lib/auth/auth-helpers"
import {
  createCategoryCore,
  renameCategoryCore,
  deleteCategoryCore,
  createExpenseCore,
  updateExpenseCore,
  deleteExpenseCore,
} from "@/lib/services/expenses/crud"
import { getCategoriesCore, getExpensesCore } from "@/lib/services/expenses/queries"
import {
  getExpenseTotalsCore,
  getExpenseSummaryByCategoryCore,
  getMonthlyBreakdownCore,
} from "@/lib/services/expenses/reporting"

// ============================================================================
// Category Actions
// ============================================================================

export async function getExpenseCategories() {
  return withAuth((userId) => getCategoriesCore(userId))
}

export async function createExpenseCategory(name: string) {
  return withAuth(async (userId) => {
    const result = await createCategoryCore(userId, name)
    revalidatePath("/expenses")
    return result
  })
}

export async function renameExpenseCategory(categoryId: string, name: string) {
  return withAuth(async (userId) => {
    const result = await renameCategoryCore(userId, categoryId, name)
    revalidatePath("/expenses")
    return result
  })
}

export async function deleteExpenseCategory(categoryId: string) {
  return withAuth(async (userId) => {
    const result = await deleteCategoryCore(userId, categoryId)
    revalidatePath("/expenses")
    return result
  })
}

// ============================================================================
// Expense Actions
// ============================================================================

export async function getExpenses(filters?: {
  startDate?: string
  endDate?: string
  categoryId?: string
}) {
  return withAuth((userId) => {
    const parsedFilters: {
      startDate?: Date
      endDate?: Date
      categoryId?: string
    } = {}

    if (filters?.startDate) {
      parsedFilters.startDate = new Date(filters.startDate)
    }
    if (filters?.endDate) {
      parsedFilters.endDate = new Date(filters.endDate)
    }
    if (filters?.categoryId) {
      parsedFilters.categoryId = filters.categoryId
    }

    return getExpensesCore(userId, parsedFilters)
  })
}

export async function createExpense(data: {
  date: string
  categoryId: string
  description: string
  amount: string
  vendor?: string
  notes?: string
}) {
  return withAuth(async (userId) => {
    const result = await createExpenseCore(userId, data)
    revalidatePath("/expenses")
    return result
  })
}

export async function updateExpense(
  expenseId: string,
  data: {
    date: string
    categoryId: string
    description: string
    amount: string
    vendor?: string
    notes?: string
  }
) {
  return withAuth(async (userId) => {
    const result = await updateExpenseCore(userId, expenseId, data)
    revalidatePath("/expenses")
    return result
  })
}

export async function deleteExpense(expenseId: string) {
  return withAuth(async (userId) => {
    const result = await deleteExpenseCore(userId, expenseId)
    revalidatePath("/expenses")
    return result
  })
}

// ============================================================================
// Reporting Actions
// ============================================================================

export async function getExpenseTotals(startDate?: string, endDate?: string) {
  return withAuth((userId) =>
    getExpenseTotalsCore(
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    )
  )
}

export async function getExpenseSummaryByCategory(startDate: string, endDate: string) {
  return withAuth((userId) =>
    getExpenseSummaryByCategoryCore(userId, new Date(startDate), new Date(endDate))
  )
}

export async function getMonthlyBreakdown(year: number) {
  return withAuth((userId) => getMonthlyBreakdownCore(userId, year))
}
```

**Step 2: Commit**

```bash
git add actions/expenses.ts
git commit -m "feat(expenses): add server actions for expenses and categories"
```

---

### Task 11: Sidebar Navigation Update

**Files:**
- Modify: `components/app-sidebar-nav.tsx`

**Step 1: Add Reports link to Accounting section**

In the `navLinks` array, add a "Reports" item to the Accounting group:

```typescript
{
  title: "Accounting",
  url: "#",
  items: [
    {
      title: "Transactions",
      url: "/bookkeeping",
    },
    {
      title: "Invoices",
      url: "/invoices",
    },
    {
      title: "Expenses",
      url: "/expenses",
    },
    {
      title: "Reports",
      url: "/reports",
    },
  ],
},
```

**Step 2: Commit**

```bash
git add components/app-sidebar-nav.tsx
git commit -m "feat(expenses): add Reports link to sidebar navigation"
```

---

### Task 12: Expenses Page — Server Component

**Files:**
- Create: `app/(dashboard)/expenses/page.tsx`

**Step 1: Create the expenses page**

This is the server component that fetches data and renders the client components. It should:
- Call `getExpenseCategories()` and `getExpenses()` in parallel
- Call `getExpenseTotals()` for summary cards
- Render summary cards (total amount, count, top category) using shadcn `<Card>`
- Pass data to a client `<ExpenseTable>` component
- Include "Add Expense" and "Manage Categories" buttons that open dialogs

Use the same page layout pattern as `app/(dashboard)/payroll/page.tsx`:
```typescript
<section className="p-4 max-w-7xl mx-auto space-y-8 w-full">
```

Refer to `app/(dashboard)/employees/page.tsx` for the simpler pattern of calling actions and rendering a table.

**Step 2: Commit**

```bash
git add app/\(dashboard\)/expenses/page.tsx
git commit -m "feat(expenses): add expenses page server component"
```

---

### Task 13: Expense Table Component

**Files:**
- Create: `components/expenses/expense-table.tsx`

**Step 1: Create the expense table**

`"use client"` component that receives `expenses: ExpenseListItem[]` and `categories: ExpenseCategoryItem[]` as props. Features:
- shadcn `<Table>` with columns: Date, Category, Description, Vendor, Amount, Actions
- Date range filter (two date inputs for start/end)
- Category dropdown filter (populated from `categories` prop)
- Each row has Edit and Delete buttons
- Edit opens the expense form dialog pre-filled
- Delete shows a confirmation dialog then calls `deleteExpense` action
- Format amount with `Intl.NumberFormat` as currency
- `toast.success` / `toast.error` for feedback (from sonner)
- `useRouter().refresh()` after mutations

Follow the component patterns from `components/payroll/payroll-employee-list.tsx` for state management and action calls.

**Step 2: Commit**

```bash
git add components/expenses/expense-table.tsx
git commit -m "feat(expenses): add expense table client component"
```

---

### Task 14: Expense Form Dialog

**Files:**
- Create: `components/expenses/expense-form-dialog.tsx`

**Step 1: Create the expense form dialog**

`"use client"` component. Props: `categories: ExpenseCategoryItem[]`, optional `expense: ExpenseListItem` (for edit mode), `open: boolean`, `onOpenChange: (open: boolean) => void`.

- Uses React Hook Form + Zod resolver with `createExpenseSchema` or `updateExpenseSchema`
- shadcn `<Dialog>` wrapper
- Form fields: Date (text input with `formatDateInput`), Category (`<Select>` from categories), Description, Amount, Vendor (optional), Notes (optional textarea)
- On submit: calls `createExpense` or `updateExpense` action
- `toast` for success/error
- `useRouter().refresh()` after successful save
- Resets form on close

**Step 2: Commit**

```bash
git add components/expenses/expense-form-dialog.tsx
git commit -m "feat(expenses): add expense form dialog component"
```

---

### Task 15: Category Management Dialog

**Files:**
- Create: `components/expenses/category-management-dialog.tsx`

**Step 1: Create the category management dialog**

`"use client"` component. Props: `categories: ExpenseCategoryItem[]`, `open: boolean`, `onOpenChange: (open: boolean) => void`.

- shadcn `<Dialog>` with a list of categories
- Text input + "Add" button at top to create new categories (calls `createExpenseCategory`)
- Each category row shows the name with Rename and Delete buttons
- Rename: inline edit (click name → text input → save with `renameExpenseCategory`)
- Delete: calls `deleteExpenseCategory` — on error (has expenses), show toast with error message
- `useRouter().refresh()` after any mutation

**Step 2: Commit**

```bash
git add components/expenses/category-management-dialog.tsx
git commit -m "feat(expenses): add category management dialog"
```

---

### Task 16: Reports Page — Server Component

**Files:**
- Create: `app/(dashboard)/reports/page.tsx`

**Step 1: Create the reports page**

Server component with two sections:

1. **Summary by Category** — calls `getExpenseSummaryByCategory` with date range from search params (default: current year start to today). Renders a `<CategorySummaryTable>` client component.

2. **Monthly Breakdown** — calls `getMonthlyBreakdown` with year from search params (default: current year). Renders a `<MonthlyBreakdownTable>` client component.

Layout:
```typescript
<section className="p-4 max-w-7xl mx-auto space-y-8 w-full">
  <Header title="Expense Reports" />
  {/* Category Summary section */}
  {/* Monthly Breakdown section */}
</section>
```

Use `searchParams` for date range and year filters (following payroll page pattern).

**Step 2: Commit**

```bash
git add app/\(dashboard\)/reports/page.tsx
git commit -m "feat(expenses): add reports page server component"
```

---

### Task 17: Category Summary Table Component

**Files:**
- Create: `components/expenses/category-summary-table.tsx`

**Step 1: Create the category summary table**

`"use client"` component. Props: `data: ExpenseSummaryByCategory[]`, `startDate: string`, `endDate: string`.

- shadcn `<Table>` with columns: Category, Total, % of Total, Count
- Grand total row at bottom (bold)
- Date range picker that updates URL search params (using `useRouter().push()`)
- Format amounts as currency, percentages with `%`
- Empty state: "No expenses found for this period"

**Step 2: Commit**

```bash
git add components/expenses/category-summary-table.tsx
git commit -m "feat(expenses): add category summary table component"
```

---

### Task 18: Monthly Breakdown Table Component

**Files:**
- Create: `components/expenses/monthly-breakdown-table.tsx`

**Step 1: Create the monthly breakdown table**

`"use client"` component. Props: `data: MonthlyBreakdownRow[]`, `year: number`.

- shadcn `<Table>` with columns: Category, Jan, Feb, Mar, ..., Dec, Total
- Year selector (previous/next buttons or dropdown) that updates URL search params
- Format amounts as currency
- Grand total row at bottom
- Empty state: "No expenses found for this year"

**Step 2: Commit**

```bash
git add components/expenses/monthly-breakdown-table.tsx
git commit -m "feat(expenses): add monthly breakdown table component"
```

---

### Task 19: Build Verification

**Step 1: Run lint**

```bash
pnpm run lint
```

Expected: No errors. Fix any lint issues that appear.

**Step 2: Run build**

```bash
pnpm run build
```

Expected: Successful build with no TypeScript errors.

**Step 3: Manual smoke test**

Start dev server with `pnpm run dev` and verify:
- `/expenses` page loads, shows empty state
- Can create a category via "Manage Categories" dialog
- Can create an expense with the new category
- Expense appears in the table
- Can edit and delete expenses
- `/reports` page loads with empty state
- After adding expenses, reports show correct totals

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(expenses): fix any remaining lint/type issues"
```
