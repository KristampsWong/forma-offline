"use client"

import { Plus } from "lucide-react"
import { useState } from "react"

import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog"
import { Button } from "@/components/ui/button"

interface AddExpensesButtonProps {
  categories: { value: string; label: string }[]
}

export function AddExpensesButton({ categories }: AddExpensesButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Button size="sm" onClick={() => setDialogOpen(true)}>
        <Plus className="size-4" />
        Add Expense
      </Button>
      <ExpenseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
      />
    </>
  )
}
