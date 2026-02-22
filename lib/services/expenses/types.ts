/** Shape returned by lean queries for expense list (with populated category) */
export interface ExpenseFromDB {
  _id: string
  companyId: string
  categoryId: {
    _id: string
    name: string
  }
  date: Date
  description: string
  amount: number
  vendor?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

/** Shape returned by lean queries for categories */
export interface ExpenseCategoryFromDB {
  _id: string
  companyId: string
  name: string
  createdAt: Date
  updatedAt: Date
}
