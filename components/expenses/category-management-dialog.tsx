"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Pencil, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import {
  createExpenseCategory,
  renameExpenseCategory,
  deleteExpenseCategory,
} from "@/actions/expenses"
import type { ExpenseCategoryItem } from "@/types/expense"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface CategoryManagementDialogProps {
  categories: ExpenseCategoryItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CategoryManagementDialog({
  categories,
  open,
  onOpenChange,
}: CategoryManagementDialogProps) {
  const router = useRouter()
  const [newName, setNewName] = useState("")
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handleAdd() {
    if (!newName.trim()) return
    setAdding(true)
    const result = await createExpenseCategory(newName.trim())
    setAdding(false)
    if (result.success) {
      toast.success("Category created")
      setNewName("")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleRename(categoryId: string) {
    if (!editingName.trim()) return
    setLoadingId(categoryId)
    const result = await renameExpenseCategory(categoryId, editingName.trim())
    setLoadingId(null)
    if (result.success) {
      toast.success("Category renamed")
      setEditingId(null)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleDelete(categoryId: string) {
    setLoadingId(categoryId)
    const result = await deleteExpenseCategory(categoryId)
    setLoadingId(null)
    if (result.success) {
      toast.success("Category deleted")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
          <DialogDescription>
            Add, rename, or delete expense categories.
          </DialogDescription>
        </DialogHeader>

        {/* Add new category */}
        <div className="flex gap-2">
          <Input
            placeholder="New category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={50}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleAdd()
              }
            }}
          />
          <Button onClick={handleAdd} disabled={adding || !newName.trim()}>
            {adding ? "Adding..." : "Add"}
          </Button>
        </div>

        {/* Category list */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No categories yet. Add one above.
            </p>
          ) : (
            categories.map((category) => (
              <div
                key={category._id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                {editingId === category._id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      maxLength={50}
                      className="h-8"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleRename(category._id)
                        }
                        if (e.key === "Escape") {
                          setEditingId(null)
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => handleRename(category._id)}
                        disabled={loadingId === category._id}
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium truncate">
                      {category.name}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => {
                          setEditingId(category._id)
                          setEditingName(category.name)
                        }}
                        disabled={loadingId === category._id}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => handleDelete(category._id)}
                        disabled={loadingId === category._id}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
