/** Serialized expense category for client components */
export interface ExpenseCategoryItem {
  _id: string
  name: string
  createdAt: string
  updatedAt: string
}

/** Serialized expense for table/list display */
export interface ExpenseListItem {
  _id: string
  categoryId: string
  categoryName: string
  date: string
  description: string
  amount: number
  vendor?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

/** Summary row for category report */
export interface ExpenseSummaryByCategory {
  categoryId: string
  categoryName: string
  total: number
  count: number
  percentage: number
}

/** Row for monthly breakdown report */
export interface MonthlyBreakdownRow {
  categoryId: string
  categoryName: string
  months: number[] // 12 entries, index 0 = January
  total: number
}
