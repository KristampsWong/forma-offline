import { DollarSign, Hash, TrendingUp } from "lucide-react"

import { getExpenseCategories, getExpenses, getExpenseTotals } from "@/actions/expenses"
import { formatAmount } from "@/lib/utils"
import Header from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExpenseTable } from "@/components/expenses/expense-table"

export default async function Page() {
  const [categoriesResult, expensesResult, totalsResult] = await Promise.all([
    getExpenseCategories(),
    getExpenses(),
    getExpenseTotals(),
  ])

  const categories = categoriesResult.success ? categoriesResult.data : []
  const expenses = expensesResult.success ? expensesResult.data : []
  const totals = totalsResult.success
    ? totalsResult.data
    : { totalAmount: 0, count: 0, topCategory: null }

  return (
    <section className="p-4 max-w-7xl mx-auto space-y-8 w-full">
      <Header title="Expenses" />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(totals.totalAmount, "currency")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Hash className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totals.topCategory?.name ?? "—"}
            </div>
            {totals.topCategory && (
              <p className="text-xs text-muted-foreground">
                {formatAmount(totals.topCategory.total, "currency")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense Table */}
      <ExpenseTable expenses={expenses} categories={categories} />
    </section>
  )
}
