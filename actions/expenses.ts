"use server"

import { revalidatePath } from "next/cache"
import { withAuth } from "@/lib/auth/auth-helpers"
import {
  createCategoryCore,
  renameCategoryCore,
  deleteCategoryCore,
  createExpenseCore,
  updateExpenseCore,
  deleteExpenseCore,
} from "@/lib/services/expenses/crud"
import { getCategoriesCore, getExpensesCore } from "@/lib/services/expenses/queries"
import {
  getExpenseTotalsCore,
  getExpenseSummaryByCategoryCore,
  getMonthlyBreakdownCore,
} from "@/lib/services/expenses/reporting"

// ============================================================================
// Category Actions
// ============================================================================

export async function getExpenseCategories() {
  return withAuth((userId) => getCategoriesCore(userId))
}

export async function createExpenseCategory(name: string) {
  return withAuth(async (userId) => {
    const result = await createCategoryCore(userId, name)
    revalidatePath("/expenses")
    return result
  })
}

export async function renameExpenseCategory(categoryId: string, name: string) {
  return withAuth(async (userId) => {
    const result = await renameCategoryCore(userId, categoryId, name)
    revalidatePath("/expenses")
    return result
  })
}

export async function deleteExpenseCategory(categoryId: string) {
  return withAuth(async (userId) => {
    const result = await deleteCategoryCore(userId, categoryId)
    revalidatePath("/expenses")
    return result
  })
}

// ============================================================================
// Expense Actions
// ============================================================================

export async function getExpenses(filters?: {
  startDate?: string
  endDate?: string
  categoryId?: string
}) {
  return withAuth((userId) => {
    const parsedFilters: {
      startDate?: Date
      endDate?: Date
      categoryId?: string
    } = {}

    if (filters?.startDate) {
      parsedFilters.startDate = new Date(filters.startDate)
    }
    if (filters?.endDate) {
      parsedFilters.endDate = new Date(filters.endDate)
    }
    if (filters?.categoryId) {
      parsedFilters.categoryId = filters.categoryId
    }

    return getExpensesCore(userId, parsedFilters)
  })
}

export async function createExpense(data: {
  date: string
  categoryId: string
  description: string
  amount: string
  vendor?: string
  notes?: string
}) {
  return withAuth(async (userId) => {
    const result = await createExpenseCore(userId, data)
    revalidatePath("/expenses")
    return result
  })
}

export async function updateExpense(
  expenseId: string,
  data: {
    date: string
    categoryId: string
    description: string
    amount: string
    vendor?: string
    notes?: string
  }
) {
  return withAuth(async (userId) => {
    const result = await updateExpenseCore(userId, expenseId, data)
    revalidatePath("/expenses")
    return result
  })
}

export async function deleteExpense(expenseId: string) {
  return withAuth(async (userId) => {
    const result = await deleteExpenseCore(userId, expenseId)
    revalidatePath("/expenses")
    return result
  })
}

// ============================================================================
// Reporting Actions
// ============================================================================

export async function getExpenseTotals(startDate?: string, endDate?: string) {
  return withAuth((userId) =>
    getExpenseTotalsCore(
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    )
  )
}

export async function getExpenseSummaryByCategory(startDate: string, endDate: string) {
  return withAuth((userId) =>
    getExpenseSummaryByCategoryCore(userId, new Date(startDate), new Date(endDate))
  )
}

export async function getMonthlyBreakdown(year: number) {
  return withAuth((userId) => getMonthlyBreakdownCore(userId, year))
}