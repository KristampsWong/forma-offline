/**
 * Expense & Category query operations
 *
 * Functions:
 * - getCategoriesCore(userId)
 * - getExpensesCore(userId, filters)
 */

import dbConnect from "@/lib/db/dbConnect"
import Company from "@/models/company"
import ExpenseCategory from "@/models/expense-category"
import Expense from "@/models/expense"
import { COMPANY_ERRORS } from "@/lib/constants/errors"
import { extractDateOnly } from "@/lib/date/utils"
import type { ExpenseCategoryItem, ExpenseListItem } from "@/types/expense"
import type { ExpenseFromDB, ExpenseCategoryFromDB } from "./types"

async function getCompanyId(userId: string): Promise<string> {
  const company = await Company.findOne({ userId }).lean()
  if (!company) throw new Error(COMPANY_ERRORS.NOT_FOUND)
  return company._id.toString()
}

export async function getCategoriesCore(
  userId: string
): Promise<ExpenseCategoryItem[]> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  const categories = await ExpenseCategory.find({ companyId })
    .sort({ name: 1 })
    .lean<ExpenseCategoryFromDB[]>()

  return categories.map((cat) => ({
    _id: cat._id.toString(),
    name: cat.name,
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
  }))
}

export async function getExpensesCore(
  userId: string,
  filters?: {
    startDate?: Date
    endDate?: Date
    categoryId?: string
  }
): Promise<ExpenseListItem[]> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  // Build query
  const query: Record<string, unknown> = { companyId }

  if (filters?.startDate || filters?.endDate) {
    query.date = {}
    if (filters.startDate) (query.date as Record<string, Date>).$gte = filters.startDate
    if (filters.endDate) (query.date as Record<string, Date>).$lte = filters.endDate
  }

  if (filters?.categoryId) {
    query.categoryId = filters.categoryId
  }

  const expenses = await Expense.find(query)
    .populate("categoryId", "name")
    .sort({ date: -1 })
    .lean<ExpenseFromDB[]>()

  return expenses.map((exp) => ({
    _id: exp._id.toString(),
    categoryId: exp.categoryId._id.toString(),
    categoryName: exp.categoryId.name,
    date: extractDateOnly(exp.date) ?? "",
    description: exp.description,
    amount: exp.amount,
    vendor: exp.vendor,
    notes: exp.notes,
    createdAt: exp.createdAt.toISOString(),
    updatedAt: exp.updatedAt.toISOString(),
  }))
}
