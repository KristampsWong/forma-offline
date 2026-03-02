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
