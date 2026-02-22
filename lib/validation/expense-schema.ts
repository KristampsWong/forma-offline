import { z } from "zod/v4"

// ============================================================================
// Category Schemas
// ============================================================================

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(50, "Category name too long"),
})

export const renameCategorySchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
  name: z.string().min(1, "Category name is required").max(50, "Category name too long"),
})

// ============================================================================
// Expense Schemas (client — flat field names for form binding)
// ============================================================================

export const createExpenseSchema = z.object({
  date: z.string().min(1, "Date is required"),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required").max(200, "Description too long"),
  amount: z.string().min(1, "Amount is required"),
  vendor: z.string().max(100, "Vendor name too long").optional().or(z.literal("")),
  notes: z.string().max(500, "Notes too long").optional().or(z.literal("")),
})

export const updateExpenseSchema = z.object({
  expenseId: z.string().min(1, "Expense ID is required"),
  date: z.string().min(1, "Date is required"),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required").max(200, "Description too long"),
  amount: z.string().min(1, "Amount is required"),
  vendor: z.string().max(100, "Vendor name too long").optional().or(z.literal("")),
  notes: z.string().max(500, "Notes too long").optional().or(z.literal("")),
})

// ============================================================================
// Inferred Types
// ============================================================================

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type RenameCategoryInput = z.infer<typeof renameCategorySchema>
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>
