# Edit & Approve Statement Transactions — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users edit AI-extracted transactions via dialog, then approve all to create Expense records.

**Architecture:** Add two server actions (`updateStatementTransaction`, `confirmStatementImport`) backed by service functions in `extraction.ts`. The `StatementTransactionsTable` gets an edit button per row (opens `ExpenseFormDialog`) and an "Approve All" button. `ExtractPanel` manages state so no page refresh is needed. Categories are fetched server-side and threaded through.

**Tech Stack:** Next.js 16 App Router, Mongoose, React Hook Form, shadcn/ui

---

### Task 1: Add error constants and service function for updating a transaction

**Files:**
- Modify: `lib/constants/errors.ts:111-119`
- Modify: `lib/services/expenses/extraction.ts`

**Step 1: Add error constants**

In `lib/constants/errors.ts`, add to `STATEMENT_IMPORT_ERRORS`:

```ts
INVALID_TRANSACTION_INDEX: "Invalid transaction index",
NOT_READY: "Import must be in ready status to confirm",
```

**Step 2: Add `updateTransactionInImport` to `lib/services/expenses/extraction.ts`**

Add after the existing `extractStatementTransactions` function:

```ts
export async function updateTransactionInImport(
  userId: string,
  importId: string,
  index: number,
  data: { date: string; categoryId: string; description: string; amount: string }
): Promise<void> {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id").lean()
  if (!company) throw new Error(COMPANY_ERRORS.NOT_FOUND)

  const statementImport = await StatementImport.findOne({
    _id: importId,
    companyId: company._id,
  })
  if (!statementImport) throw new Error(STATEMENT_IMPORT_ERRORS.NOT_FOUND)

  if (index < 0 || index >= statementImport.transactions.length) {
    throw new Error(STATEMENT_IMPORT_ERRORS.INVALID_TRANSACTION_INDEX)
  }

  const parsedDate = parseToUTCMidnight(data.date)
  if (!parsedDate) throw new Error(EXPENSE_ERRORS.INVALID_DATE)

  const amount = parseFloat(data.amount)
  if (isNaN(amount) || amount <= 0) throw new Error(EXPENSE_ERRORS.INVALID_AMOUNT)

  statementImport.transactions[index].date = data.date
  statementImport.transactions[index].description = data.description.trim()
  statementImport.transactions[index].amount = amount
  statementImport.transactions[index].categoryId = new mongoose.Types.ObjectId(data.categoryId)
  await statementImport.save()
}
```

Add these imports at the top of the file:

```ts
import { parseToUTCMidnight } from "@/lib/date/utils"
import { EXPENSE_ERRORS } from "@/lib/constants/errors"
```

**Step 3: Commit**

```bash
git add lib/constants/errors.ts lib/services/expenses/extraction.ts
git commit -m "feat: add updateTransactionInImport service function"
```

---

### Task 2: Add service function for confirming a statement import

**Files:**
- Modify: `lib/services/expenses/extraction.ts`

**Step 1: Add `confirmStatementImportCore` to `lib/services/expenses/extraction.ts`**

Add after `updateTransactionInImport`:

```ts
export async function confirmStatementImportCore(
  userId: string,
  importId: string
): Promise<void> {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id").lean()
  if (!company) throw new Error(COMPANY_ERRORS.NOT_FOUND)

  const statementImport = await StatementImport.findOne({
    _id: importId,
    companyId: company._id,
  })
  if (!statementImport) throw new Error(STATEMENT_IMPORT_ERRORS.NOT_FOUND)

  if (statementImport.status !== "ready") {
    throw new Error(STATEMENT_IMPORT_ERRORS.NOT_READY)
  }

  const expenses = statementImport.transactions.map((t) => ({
    companyId: company._id,
    categoryId: t.categoryId,
    date: parseToUTCMidnight(t.date),
    description: t.description,
    amount: t.amount,
    statementImportId: statementImport._id,
  }))

  await Expense.insertMany(expenses)

  statementImport.status = "confirmed"
  await statementImport.save()

  log.info(
    `Confirmed import ${importId}: created ${expenses.length} expenses`
  )
}
```

Add the `Expense` model import at the top:

```ts
import Expense from "@/models/expense"
```

**Step 2: Commit**

```bash
git add lib/services/expenses/extraction.ts
git commit -m "feat: add confirmStatementImportCore service function"
```

---

### Task 3: Add server actions for update and confirm

**Files:**
- Modify: `actions/statementimports.ts`

**Step 1: Add `updateStatementTransaction` action**

Add the import for `updateTransactionInImport` and `confirmStatementImportCore`:

```ts
import {
  extractStatementTransactions,
  updateTransactionInImport,
  confirmStatementImportCore,
} from "@/lib/services/expenses/extraction"
```

Add `revalidatePath` import:

```ts
import { revalidatePath } from "next/cache"
```

Add after the `extractTransactions` action:

```ts
export async function updateStatementTransaction(
  importId: string,
  index: number,
  data: { date: string; categoryId: string; description: string; amount: string }
) {
  return withAuth(async (userId) => {
    await updateTransactionInImport(userId, importId, index, data)

    // Return updated transaction with resolved category name
    await dbConnect()
    const category = await ExpenseCategory.findById(data.categoryId)
      .select("name")
      .lean()

    return {
      date: data.date,
      description: data.description.trim(),
      amount: parseFloat(data.amount),
      categoryName: category?.name,
      selected: true,
    } satisfies StatementTransaction
  })
}
```

**Step 2: Add `confirmStatementImport` action**

```ts
export async function confirmStatementImport(importId: string) {
  return withAuth(async (userId) => {
    await confirmStatementImportCore(userId, importId)
    revalidatePath("/expenses")
    return { confirmed: true }
  })
}
```

**Step 3: Commit**

```bash
git add actions/statementimports.ts
git commit -m "feat: add updateStatementTransaction and confirmStatementImport actions"
```

---

### Task 4: Add categories to the import detail page

**Files:**
- Modify: `app/(dashboard)/expenses/import/[id]/page.tsx`

**Step 1: Fetch categories and pass to ExtractPanel**

Update the page to fetch categories and pass them through:

```tsx
import {
  getStatementImportById,
} from "@/actions/statementimports"
import { getExpenseCategories } from "@/actions/expenses"
import Header from "@/components/header"
import Breadcrumb, {
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import PdfViewer from "@/components/expenses/pdf-viewer"
import ExtractPanel from "@/components/expenses/upload-files/extract-button"
import { notFound } from "next/navigation"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [result, categoriesResult] = await Promise.all([
    getStatementImportById(id),
    getExpenseCategories(),
  ])
  if (!result.success) notFound()

  const { fileName, presignedUrl } = result.data
  const categories = categoriesResult.success
    ? categoriesResult.data.map((c) => ({ value: c._id, label: c.name }))
    : []

  return (
    <main className="p-4 max-w-7xl mx-auto space-y-8 w-full">
      <Header>
        <Breadcrumb>
          <BreadcrumbLink href={"/expenses"} text={"Expenses"} />
          <BreadcrumbSeparator />
          <BreadcrumbLink
            href={"/expenses/import"}
            text={"Import Transactions"}
          />
          <BreadcrumbSeparator />
          <span className="text-foreground font-semibold">{fileName}</span>
        </Breadcrumb>
      </Header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="border rounded-lg overflow-hidden h-[calc(100vh-200px)]">
          <PdfViewer url={presignedUrl} />
        </div>
        <div className="lg:col-span-2">
          <ExtractPanel
            importId={id}
            initialStatus={result.data.status}
            initialTransactions={result.data.transactions}
            categories={categories}
          />
        </div>
      </div>
    </main>
  )
}
```

**Step 2: Commit**

```bash
git add app/\(dashboard\)/expenses/import/\[id\]/page.tsx
git commit -m "feat: pass categories to ExtractPanel on import detail page"
```

---

### Task 5: Update StatementTransactionsTable with edit and approve buttons

**Files:**
- Modify: `components/expenses/statement-transactions-table.tsx`

**Step 1: Add edit button, approve button, and ExpenseFormDialog integration**

```tsx
"use client"

import { useState } from "react"
import { Loader2, Pencil, Check } from "lucide-react"
import { toast } from "sonner"

import {
  updateStatementTransaction,
  confirmStatementImport,
  type StatementTransaction,
} from "@/actions/statementimports"
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatAmount } from "@/lib/utils"

interface StatementTransactionsTableProps {
  importId: string
  transactions: StatementTransaction[]
  categories: { value: string; label: string }[]
  status: string
  onTransactionUpdate: (index: number, updated: StatementTransaction) => void
  onConfirm: () => void
}

export function StatementTransactionsTable({
  importId,
  transactions,
  categories,
  status,
  onTransactionUpdate,
  onConfirm,
}: StatementTransactionsTableProps) {
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)

  if (transactions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No transactions found.</p>
    )
  }

  const editTransaction = editIndex !== null ? transactions[editIndex] : null

  // Map StatementTransaction → ExpenseListItem shape for the dialog
  const expenseForDialog = editTransaction
    ? {
        _id: String(editIndex),
        categoryId:
          categories.find(
            (c) => c.label === editTransaction.categoryName
          )?.value ?? "",
        categoryName: editTransaction.categoryName ?? "",
        date: editTransaction.date,
        description: editTransaction.description,
        amount: editTransaction.amount,
        createdAt: "",
        updatedAt: "",
      }
    : undefined

  async function handleEditSave(data: {
    date: string
    categoryId: string
    description: string
    amount: string
    vendor?: string
    notes?: string
  }) {
    if (editIndex === null) return

    const result = await updateStatementTransaction(importId, editIndex, {
      date: data.date,
      categoryId: data.categoryId,
      description: data.description,
      amount: data.amount,
    })

    if (result.success) {
      onTransactionUpdate(editIndex, result.data)
      toast.success("Transaction updated")
    } else {
      toast.error(result.error)
    }
  }

  async function handleConfirm() {
    setConfirming(true)
    try {
      const result = await confirmStatementImport(importId)
      if (result.success) {
        toast.success("Transactions approved and added to expenses")
        onConfirm()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setConfirming(false)
    }
  }

  const isReady = status === "ready"

  return (
    <div className="overflow-hidden">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-end">Amount</TableHead>
              {isReady && <TableHead className="text-end">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: transactions have no unique id
              <TableRow key={i}>
                <TableCell className="whitespace-nowrap">{t.date}</TableCell>
                <TableCell>
                  <span className="max-w-60 truncate block">
                    {t.description}
                  </span>
                </TableCell>
                <TableCell>{t.categoryName ?? "—"}</TableCell>
                <TableCell className="text-end tracking-wide">
                  {formatAmount(t.amount, "currency")}
                </TableCell>
                {isReady && (
                  <TableCell className="text-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditIndex(i)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between px-2 py-3">
        <span className="text-sm text-muted-foreground">
          {transactions.length} transaction
          {transactions.length !== 1 && "s"}
        </span>
        {isReady && (
          <Button onClick={handleConfirm} disabled={confirming}>
            {confirming ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <Check className="size-4" />
                Approve All
              </>
            )}
          </Button>
        )}
      </div>

      {editTransaction && (
        <ExpenseFormDialog
          open={editIndex !== null}
          onOpenChange={(open) => {
            if (!open) setEditIndex(null)
          }}
          categories={categories}
          expense={expenseForDialog}
          onSubmitOverride={handleEditSave}
        />
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/expenses/statement-transactions-table.tsx
git commit -m "feat: add edit and approve buttons to transactions table"
```

---

### Task 6: Add `onSubmitOverride` prop to ExpenseFormDialog

**Files:**
- Modify: `components/expenses/expense-form-dialog.tsx`

The table needs to intercept the form submit to call `updateStatementTransaction` instead of `createExpense`/`updateExpense`. Add an optional `onSubmitOverride` callback.

**Step 1: Update the dialog props and submit handler**

In `ExpenseFormDialogProps`, add:

```ts
onSubmitOverride?: (data: CreateExpenseInput) => Promise<void>
```

Update the destructured props:

```ts
export function ExpenseFormDialog({
  open,
  onOpenChange,
  categories,
  expense,
  onSubmitOverride,
}: ExpenseFormDialogProps) {
```

Update the `onSubmit` function to use the override when provided:

```ts
const onSubmit = async (data: CreateExpenseInput) => {
  try {
    if (onSubmitOverride) {
      await onSubmitOverride(data)
      form.reset()
      onOpenChange(false)
      return
    }

    const result = isEdit
      ? await updateExpense(expense._id, data)
      : await createExpense(data)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success(isEdit ? "Expense updated successfully" : "Expense added successfully")
    form.reset()
    onOpenChange(false)
  } catch (error) {
    logger.error(`Error ${isEdit ? "updating" : "creating"} expense:`, error)
    toast.error("An unexpected error occurred. Please try again.")
  }
}
```

**Step 2: Commit**

```bash
git add components/expenses/expense-form-dialog.tsx
git commit -m "feat: add onSubmitOverride prop to ExpenseFormDialog"
```

---

### Task 7: Update ExtractPanel to wire up edit/confirm callbacks

**Files:**
- Modify: `components/expenses/upload-files/extract-button.tsx`

**Step 1: Add categories prop and wire up callbacks**

```tsx
"use client"

import { useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import {
  extractTransactions,
  type StatementTransaction,
} from "@/actions/statementimports"
import { Button } from "@/components/ui/button"
import { StatementTransactionsTable } from "@/components/expenses/statement-transactions-table"

interface ExtractPanelProps {
  importId: string
  initialStatus: string
  initialTransactions: StatementTransaction[]
  categories: { value: string; label: string }[]
}

export default function ExtractPanel({
  importId,
  initialStatus,
  initialTransactions,
  categories,
}: ExtractPanelProps) {
  const [loading, setLoading] = useState(false)
  const [transactions, setTransactions] =
    useState<StatementTransaction[]>(initialTransactions)
  const [status, setStatus] = useState(initialStatus)

  async function handleExtract() {
    setLoading(true)
    try {
      const result = await extractTransactions(importId)
      if (result.success) {
        toast.success("Transactions extracted successfully")
        setTransactions(result.data)
        setStatus("ready")
      } else {
        toast.error(result.error)
        setStatus("failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  function handleTransactionUpdate(index: number, updated: StatementTransaction) {
    setTransactions((prev) =>
      prev.map((t, i) => (i === index ? updated : t))
    )
  }

  function handleConfirm() {
    setStatus("confirmed")
  }

  return (
    <div className="space-y-4">
      {(status === "uploaded" || status === "failed") && (
        <Button onClick={handleExtract} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Extract Transactions
            </>
          )}
        </Button>
      )}
      {transactions.length > 0 && (
        <StatementTransactionsTable
          importId={importId}
          transactions={transactions}
          categories={categories}
          status={status}
          onTransactionUpdate={handleTransactionUpdate}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/expenses/upload-files/extract-button.tsx
git commit -m "feat: wire up edit and confirm in ExtractPanel"
```

---

### Task 8: Build and verify

**Step 1: Run build**

```bash
pnpm run build
```

Fix any type errors.

**Step 2: Run lint**

```bash
pnpm run lint
```

**Step 3: Final commit if fixes needed**

```bash
git add -A
git commit -m "fix: resolve build/lint issues for edit and approve feature"
```
