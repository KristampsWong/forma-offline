"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { createExpenseCategory } from "@/actions/expenses"
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
import { FormField } from "@/components/ui/form-field"
import { logger } from "@/lib/logger"
import {
  type CreateCategoryInput,
  createCategorySchema,
} from "@/lib/validation/expense-schema"

export function AddCategoryButton() {
  const [dialogOpen, setDialogOpen] = useState(false)

  const form = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: "",
    },
  })

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      form.reset()
    }
  }

  const onSubmit = async (data: CreateCategoryInput) => {
    try {
      const result = await createExpenseCategory(data.name)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Category added successfully")
      form.reset()
      setDialogOpen(false)
    } catch (error) {
      logger.error("Error creating category:", error)
      toast.error("An unexpected error occurred. Please try again.")
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="size-4" />
          Add Category
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-100">
        <DialogHeader>
          <DialogTitle>Add Category</DialogTitle>
          <DialogDescription>
            Create a new expense category
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            label="Category Name"
            id="categoryName"
            placeholder="Office Supplies, Travel..."
            errorPosition="inline"
          />

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Save Category</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
