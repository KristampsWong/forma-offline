"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Plus, Settings, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { deleteExpense } from "@/actions/expenses"
import { formatAmount } from "@/lib/utils"
import type { ExpenseCategoryItem, ExpenseListItem } from "@/types/expense"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ExpenseFormDialog } from "./expense-form-dialog"
import { CategoryManagementDialog } from "./category-management-dialog"

interface ExpenseTableProps {
  expenses: ExpenseListItem[]
  categories: ExpenseCategoryItem[]
}

export function ExpenseTable({ expenses, categories }: ExpenseTableProps) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [editExpense, setEditExpense] = useState<ExpenseListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ExpenseListItem | null>(null)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await deleteExpense(deleteTarget._id)
    setDeleting(false)
    if (result.success) {
      toast.success("Expense deleted")
      setDeleteTarget(null)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <>
      {/* Action buttons */}
      <div className="flex gap-2">
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4 mr-1" />
          Add Expense
        </Button>
        <Button variant="outline" onClick={() => setCategoryOpen(true)}>
          <Settings className="size-4 mr-1" />
          Manage Categories
        </Button>
      </div>

      {/* Expense table */}
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start">Date</TableHead>
              <TableHead className="text-start">Category</TableHead>
              <TableHead className="text-start">Description</TableHead>
              <TableHead className="text-start">Vendor</TableHead>
              <TableHead className="text-end">Amount</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No expenses found. Add your first expense to get started.
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
                <TableRow key={expense._id}>
                  <TableCell className="text-start">{expense.date}</TableCell>
                  <TableCell className="text-start">{expense.categoryName}</TableCell>
                  <TableCell className="text-start">{expense.description}</TableCell>
                  <TableCell className="text-start">{expense.vendor ?? "—"}</TableCell>
                  <TableCell className="text-end font-medium">
                    {formatAmount(expense.amount, "currency")}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditExpense(expense)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(expense)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add expense dialog */}
      <ExpenseFormDialog
        categories={categories}
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      {/* Edit expense dialog */}
      <ExpenseFormDialog
        categories={categories}
        expense={editExpense ?? undefined}
        open={!!editExpense}
        onOpenChange={(open) => {
          if (!open) setEditExpense(null)
        }}
      />

      {/* Category management dialog */}
      <CategoryManagementDialog
        categories={categories}
        open={categoryOpen}
        onOpenChange={setCategoryOpen}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
