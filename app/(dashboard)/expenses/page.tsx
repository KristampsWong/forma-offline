import Header from "@/components/header"
import { AddExpensesButton } from "@/components/expenses/add-expenses-button"
import { AddCategoryButton } from "@/components/expenses/add-category-button"
import { ExpensesTable } from "@/components/expenses/expenses-table"
import { getExpenseCategories, getExpenses } from "@/actions/expenses"
import { parseDateParam } from "@/lib/date/utils"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>
}) {
  const { category, start, end } = await searchParams

  const filters: { startDate?: string; endDate?: string; categoryId?: string } =
    {}

  const parsedStart = parseDateParam(start)
  const parsedEnd = parseDateParam(end)

  if (parsedStart) {
    filters.startDate = parsedStart.toISOString()
  }
  if (parsedEnd) {
    filters.endDate = parsedEnd.toISOString()
  }
  if (category) {
    filters.categoryId = category
  }

  const [categoriesResult, expensesResult] = await Promise.all([
    getExpenseCategories(),
    getExpenses(Object.keys(filters).length > 0 ? filters : undefined),
  ])

  const categories = categoriesResult.success
    ? categoriesResult.data.map((cat) => ({ value: cat._id, label: cat.name }))
    : []

  const expenses = expensesResult.success ? expensesResult.data : []

  return (
    <main className="p-4 max-w-7xl mx-auto space-y-8 w-full">
      <Header title="Expenses">
        <div className="space-x-2">
          <AddCategoryButton />
          <AddExpensesButton categories={categories} />
        </div>
      </Header>
      <ExpensesTable data={expenses} categories={categories} />
    </main>
  )
}
