"use client"

import { FileUp, PenLine, Plus } from "lucide-react"
import { useState } from "react"

import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
interface AddExpensesButtonProps {
  categories: { value: string; label: string }[]
}

export function AddExpensesButton({ categories }: AddExpensesButtonProps) {
  const [formDialogOpen, setFormDialogOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" size="sm">
            <Plus className="size-4" />
            Add Expense
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setFormDialogOpen(true)}>
            <PenLine className="size-4" />
            Add Manually
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href='/expenses/import'>
            <FileUp className="size-4" />
            Upload PDF
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExpenseFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        categories={categories}
      />
    
    </>
  )
}
