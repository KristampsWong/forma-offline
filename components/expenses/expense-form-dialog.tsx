"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { createExpense, updateExpense } from "@/actions/expenses"
import {
  createExpenseSchema,
  type CreateExpenseInput,
} from "@/lib/validation/expense-schema"
import type { ExpenseCategoryItem, ExpenseListItem } from "@/types/expense"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { FormField, FormSelect, FormDateField, FormFieldCustom } from "@/components/ui/form-field"

interface ExpenseFormDialogProps {
  categories: ExpenseCategoryItem[]
  expense?: ExpenseListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExpenseFormDialog({
  categories,
  expense,
  open,
  onOpenChange,
}: ExpenseFormDialogProps) {
  const router = useRouter()
  const isEdit = !!expense

  const form = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      date: "",
      categoryId: "",
      description: "",
      amount: "",
      vendor: "",
      notes: "",
    },
  })

  // Reset form when dialog opens/closes or expense changes
  useEffect(() => {
    if (open && expense) {
      form.reset({
        date: expense.date,
        categoryId: expense.categoryId,
        description: expense.description,
        amount: String(expense.amount),
        vendor: expense.vendor ?? "",
        notes: expense.notes ?? "",
      })
    } else if (open && !expense) {
      form.reset({
        date: "",
        categoryId: "",
        description: "",
        amount: "",
        vendor: "",
        notes: "",
      })
    }
  }, [open, expense, form])

  const categoryOptions = categories.map((cat) => ({
    value: cat._id,
    label: cat.name,
  }))

  async function onSubmit(data: CreateExpenseInput) {
    const payload = {
      date: data.date,
      categoryId: data.categoryId,
      description: data.description,
      amount: data.amount,
      vendor: data.vendor || undefined,
      notes: data.notes || undefined,
    }

    const result = isEdit
      ? await updateExpense(expense._id, payload)
      : await createExpense(payload)

    if (result.success) {
      toast.success(isEdit ? "Expense updated" : "Expense created")
      onOpenChange(false)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense" : "Add Expense"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the expense details." : "Enter the details for the new expense."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormDateField
            control={form.control}
            name="date"
            label="Date"
            id="expense-date"
          />

          <FormSelect
            control={form.control}
            name="categoryId"
            label="Category"
            id="expense-category"
            options={categoryOptions}
            placeholder="Select a category"
          />

          <FormField
            control={form.control}
            name="description"
            label="Description"
            id="expense-description"
            placeholder="What was this expense for?"
            maxLength={200}
          />

          <FormField
            control={form.control}
            name="amount"
            label="Amount"
            id="expense-amount"
            placeholder="0.00"
            inputMode="decimal"
          />

          <FormField
            control={form.control}
            name="vendor"
            label="Vendor (optional)"
            id="expense-vendor"
            placeholder="Company or person paid"
            maxLength={100}
          />

          <FormFieldCustom
            control={form.control}
            name="notes"
            label="Notes (optional)"
            id="expense-notes"
            renderInput={(field) => (
              <Textarea
                id="expense-notes"
                placeholder="Additional notes..."
                maxLength={500}
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                rows={3}
              />
            )}
          />

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? "Saving..."
                : isEdit
                  ? "Update"
                  : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
