/**
 * Expense & Category CRUD operations
 *
 * Functions:
 * - createCategoryCore(userId, name)
 * - renameCategoryCore(userId, categoryId, name)
 * - deleteCategoryCore(userId, categoryId)
 * - createExpenseCore(userId, data)
 * - updateExpenseCore(userId, expenseId, data)
 * - deleteExpenseCore(userId, expenseId)
 */

import dbConnect from "@/lib/db/dbConnect"
import Company from "@/models/company"
import ExpenseCategory from "@/models/expense-category"
import Expense from "@/models/expense"
import { COMPANY_ERRORS, EXPENSE_CATEGORY_ERRORS, EXPENSE_ERRORS } from "@/lib/constants/errors"
import { parseToUTCMidnight, extractDateOnly } from "@/lib/date/utils"
import type { ExpenseCategoryItem, ExpenseListItem } from "@/types/expense"

async function getCompanyId(userId: string): Promise<string> {
  const company = await Company.findOne({ userId }).lean()
  if (!company) throw new Error(COMPANY_ERRORS.NOT_FOUND)
  return company._id.toString()
}

// ============================================================================
// Category CRUD
// ============================================================================

export async function createCategoryCore(
  userId: string,
  name: string
): Promise<ExpenseCategoryItem> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  // Check for duplicate name
  const existing = await ExpenseCategory.findOne({ companyId, name: name.trim() }).lean()
  if (existing) throw new Error(EXPENSE_CATEGORY_ERRORS.ALREADY_EXISTS)

  const category = await ExpenseCategory.create({
    companyId,
    name: name.trim(),
  })

  return {
    _id: category._id.toString(),
    name: category.name,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  }
}

export async function renameCategoryCore(
  userId: string,
  categoryId: string,
  name: string
): Promise<ExpenseCategoryItem> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  // Check for duplicate name (excluding current category)
  const existing = await ExpenseCategory.findOne({
    companyId,
    name: name.trim(),
    _id: { $ne: categoryId },
  }).lean()
  if (existing) throw new Error(EXPENSE_CATEGORY_ERRORS.ALREADY_EXISTS)

  const category = await ExpenseCategory.findOneAndUpdate(
    { _id: categoryId, companyId },
    { $set: { name: name.trim() } },
    { returnDocument: 'after' }
  ).lean()

  if (!category) throw new Error(EXPENSE_CATEGORY_ERRORS.NOT_FOUND)

  return {
    _id: category._id.toString(),
    name: category.name,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  }
}

export async function deleteCategoryCore(
  userId: string,
  categoryId: string
): Promise<{ deleted: true }> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  // Check if category has expenses
  const expenseCount = await Expense.countDocuments({ companyId, categoryId })
  if (expenseCount > 0) throw new Error(EXPENSE_CATEGORY_ERRORS.HAS_EXPENSES)

  const result = await ExpenseCategory.findOneAndDelete({ _id: categoryId, companyId })
  if (!result) throw new Error(EXPENSE_CATEGORY_ERRORS.NOT_FOUND)

  return { deleted: true }
}

// ============================================================================
// Expense CRUD
// ============================================================================

export async function createExpenseCore(
  userId: string,
  data: {
    date: string
    categoryId: string
    description: string
    amount: string
    vendor?: string
    notes?: string
  }
): Promise<ExpenseListItem> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  // Validate category belongs to this company
  const category = await ExpenseCategory.findOne({ _id: data.categoryId, companyId }).lean()
  if (!category) throw new Error(EXPENSE_ERRORS.CATEGORY_NOT_FOUND)

  // Parse date to UTC
  const parsedDate = parseToUTCMidnight(data.date)
  if (!parsedDate) throw new Error(EXPENSE_ERRORS.INVALID_DATE)

  const amount = parseFloat(data.amount)
  if (isNaN(amount) || amount <= 0) throw new Error(EXPENSE_ERRORS.INVALID_AMOUNT)

  const expense = await Expense.create({
    companyId,
    categoryId: data.categoryId,
    date: parsedDate,
    description: data.description.trim(),
    amount,
    vendor: data.vendor?.trim() || undefined,
    notes: data.notes?.trim() || undefined,
  })

  return {
    _id: expense._id.toString(),
    categoryId: category._id.toString(),
    categoryName: category.name,
    date: extractDateOnly(expense.date) ?? "",
    description: expense.description,
    amount: expense.amount,
    vendor: expense.vendor,
    notes: expense.notes,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  }
}

export async function updateExpenseCore(
  userId: string,
  expenseId: string,
  data: {
    date: string
    categoryId: string
    description: string
    amount: string
    vendor?: string
    notes?: string
  }
): Promise<ExpenseListItem> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  // Validate category belongs to this company
  const category = await ExpenseCategory.findOne({ _id: data.categoryId, companyId }).lean()
  if (!category) throw new Error(EXPENSE_ERRORS.CATEGORY_NOT_FOUND)

  const parsedDate = parseToUTCMidnight(data.date)
  if (!parsedDate) throw new Error(EXPENSE_ERRORS.INVALID_DATE)

  const amount = parseFloat(data.amount)
  if (isNaN(amount) || amount <= 0) throw new Error(EXPENSE_ERRORS.INVALID_AMOUNT)

  const expense = await Expense.findOneAndUpdate(
    { _id: expenseId, companyId },
    {
      $set: {
        categoryId: data.categoryId,
        date: parsedDate,
        description: data.description.trim(),
        amount,
        vendor: data.vendor?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      },
    },
    { returnDocument: 'after' }
  ).lean()

  if (!expense) throw new Error(EXPENSE_ERRORS.NOT_FOUND)

  return {
    _id: expense._id.toString(),
    categoryId: category._id.toString(),
    categoryName: category.name,
    date: extractDateOnly(expense.date) ?? "",
    description: expense.description,
    amount: expense.amount,
    vendor: expense.vendor,
    notes: expense.notes,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  }
}

export async function deleteExpenseCore(
  userId: string,
  expenseId: string
): Promise<{ deleted: true }> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  const result = await Expense.findOneAndDelete({ _id: expenseId, companyId })
  if (!result) throw new Error(EXPENSE_ERRORS.NOT_FOUND)

  return { deleted: true }
}