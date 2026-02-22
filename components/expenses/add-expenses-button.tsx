"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { createExpense } from "@/actions/expenses"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface AddExpensesButtonProps {
  categories: { value: string; label: string }[]
}

export function AddExpensesButton({ categories }: AddExpensesButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const form = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      date: "",
      categoryId: categories[0]?.value ?? "",
      description: "",
      amount: "",
      vendor: "",
      notes: "",
    },
  })

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      form.reset()
    }
  }

  const onSubmit = async (data: CreateExpenseInput) => {
    try {
      const result = await createExpense(data)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Expense added successfully")
      form.reset()
      setDialogOpen(false)
    } catch (error) {
      logger.error("Error creating expense:", error)
      toast.error("An unexpected error occurred. Please try again.")
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-150">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>
            Record a new business expense
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
            <Button type="submit">Save Expense</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
