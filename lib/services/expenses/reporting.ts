/**
 * Expense reporting and aggregation
 *
 * Functions:
 * - getExpenseSummaryByCategoryCore(userId, startDate, endDate)
 * - getMonthlyBreakdownCore(userId, year)
 * - getExpenseTotalsCore(userId, startDate?, endDate?) — for summary cards
 */

import dbConnect from "@/lib/db/dbConnect"
import Company from "@/models/company"
import ExpenseCategory from "@/models/expense-category"
import Expense from "@/models/expense"
import { COMPANY_ERRORS } from "@/lib/constants/errors"
import type { ExpenseSummaryByCategory, MonthlyBreakdownRow } from "@/types/expense"
import type { ExpenseCategoryFromDB } from "./types"

async function getCompanyId(userId: string): Promise<string> {
  const company = await Company.findOne({ userId }).lean()
  if (!company) throw new Error(COMPANY_ERRORS.NOT_FOUND)
  return company._id.toString()
}

export interface ExpenseTotals {
  totalAmount: number
  count: number
  topCategory: { name: string; total: number } | null
}

export async function getExpenseTotalsCore(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ExpenseTotals> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  const match: Record<string, unknown> = { companyId }
  if (startDate || endDate) {
    match.date = {}
    if (startDate) (match.date as Record<string, Date>).$gte = startDate
    if (endDate) (match.date as Record<string, Date>).$lte = endDate
  }

  const result = await Expense.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$categoryId",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ])

  if (result.length === 0) {
    return { totalAmount: 0, count: 0, topCategory: null }
  }

  const totalAmount = result.reduce((sum, r) => sum + r.total, 0)
  const totalCount = result.reduce((sum, r) => sum + r.count, 0)

  // Get top category name
  const topCatDoc = await ExpenseCategory.findById(result[0]._id).lean()

  return {
    totalAmount,
    count: totalCount,
    topCategory: topCatDoc ? { name: topCatDoc.name, total: result[0].total } : null,
  }
}

export async function getExpenseSummaryByCategoryCore(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<ExpenseSummaryByCategory[]> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  const result = await Expense.aggregate([
    {
      $match: {
        companyId,
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$categoryId",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ])

  if (result.length === 0) return []

  const grandTotal = result.reduce((sum, r) => sum + r.total, 0)

  // Get category names
  const categoryIds = result.map((r) => r._id)
  const categories = await ExpenseCategory.find({ _id: { $in: categoryIds } })
    .lean<ExpenseCategoryFromDB[]>()
  const catMap = new Map(categories.map((c) => [c._id.toString(), c.name]))

  return result.map((r) => ({
    categoryId: r._id.toString(),
    categoryName: catMap.get(r._id.toString()) ?? "Unknown",
    total: r.total,
    count: r.count,
    percentage: grandTotal > 0 ? Math.round((r.total / grandTotal) * 10000) / 100 : 0,
  }))
}

export async function getMonthlyBreakdownCore(
  userId: string,
  year: number
): Promise<MonthlyBreakdownRow[]> {
  await dbConnect()
  const companyId = await getCompanyId(userId)

  const startDate = new Date(Date.UTC(year, 0, 1))
  const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))

  const result = await Expense.aggregate([
    {
      $match: {
        companyId,
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          categoryId: "$categoryId",
          month: { $month: "$date" },
        },
        total: { $sum: "$amount" },
      },
    },
  ])

  if (result.length === 0) return []

  // Get all category names
  const categoryIds = [...new Set(result.map((r) => r._id.categoryId.toString()))]
  const categories = await ExpenseCategory.find({ _id: { $in: categoryIds } })
    .lean<ExpenseCategoryFromDB[]>()
  const catMap = new Map(categories.map((c) => [c._id.toString(), c.name]))

  // Build rows: one per category, 12 month columns
  const rowMap = new Map<string, MonthlyBreakdownRow>()

  for (const r of result) {
    const catId = r._id.categoryId.toString()
    if (!rowMap.has(catId)) {
      rowMap.set(catId, {
        categoryId: catId,
        categoryName: catMap.get(catId) ?? "Unknown",
        months: Array(12).fill(0),
        total: 0,
      })
    }
    const row = rowMap.get(catId)!
    const monthIndex = r._id.month - 1 // MongoDB $month is 1-indexed
    row.months[monthIndex] = r.total
    row.total += r.total
  }

  return Array.from(rowMap.values()).sort((a, b) => b.total - a.total)
}
