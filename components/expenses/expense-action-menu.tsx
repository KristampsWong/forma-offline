"use client"

import { EllipsisVertical, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { deleteExpense } from "@/actions/expenses"
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logger } from "@/lib/logger"
import { cn } from "@/lib/utils"
import type { ExpenseListItem } from "@/types/expense"

interface ExpenseActionMenuProps {
  expense: ExpenseListItem
  categories: { value: string; label: string }[]
}

export function ExpenseActionMenu({
  expense,
  categories,
}: ExpenseActionMenuProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const result = await deleteExpense(expense._id)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Expense deleted successfully")
      setDeleteOpen(false)
    } catch (error) {
      logger.error("Error deleting expense:", error)
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "focus-visible:ring-0 focus-visible:border-transparent",
          )}
        >
          <EllipsisVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8}>
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExpenseFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        categories={categories}
        expense={expense}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className={buttonVariants({ variant: "destructive" })}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
