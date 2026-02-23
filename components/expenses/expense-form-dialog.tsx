"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { createExpense, updateExpense } from "@/actions/expenses"
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
import {
  FormDateField,
  FormField,
  FormFieldCustom,
  FormSelect,
} from "@/components/ui/form-field"
import { Textarea } from "@/components/ui/textarea"
import { logger } from "@/lib/logger"
import {
  type CreateExpenseInput,
  createExpenseSchema,
} from "@/lib/validation/expense-schema"
import type { ExpenseListItem } from "@/types/expense"

interface ExpenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: { value: string; label: string }[]
  expense?: ExpenseListItem
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  categories,
  expense,
}: ExpenseFormDialogProps) {
  const isEdit = !!expense

  const form = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      date: expense?.date ?? "",
      categoryId: expense?.categoryId ?? categories[0]?.value ?? "",
      description: expense?.description ?? "",
      amount: expense ? String(expense.amount) : "",
      vendor: expense?.vendor ?? "",
      notes: expense?.notes ?? "",
    },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      form.reset()
    }
  }

  const onSubmit = async (data: CreateExpenseInput) => {
    try {
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-150">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Expense" : "Add Expense"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update expense details" : "Record a new business expense"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormDateField
              control={form.control}
              name="date"
              label="Date"
              id="expenseDate"
              errorPosition="inline"
            />
            <FormSelect
              control={form.control}
              name="categoryId"
              label="Category"
              id="categoryId"
              options={categories}
              placeholder="Select category"
              errorPosition="inline"
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            label="Description"
            id="description"
            placeholder="Office supplies, software subscription..."
            errorPosition="inline"
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="amount"
              label="Amount"
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              errorPosition="inline"
            />
            <FormField
              control={form.control}
              name="vendor"
              label={
                <>
                  Vendor{" "}
                  <span className="text-xs text-muted-foreground">
                    Optional
                  </span>
                </>
              }
              id="vendor"
              placeholder="Amazon, Staples..."
              errorPosition="inline"
            />
          </div>

          <FormFieldCustom
            control={form.control}
            name="notes"
            label={
              <>
                Notes{" "}
                <span className="text-xs text-muted-foreground">
                  Optional
                </span>
              </>
            }
            id="notes"
            errorPosition="inline"
            renderInput={(field) => (
              <Textarea
                id="notes"
                placeholder="Additional details..."
                maxLength={500}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
              />
            )}
          />

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">
              {isEdit ? "Save Changes" : "Save Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
