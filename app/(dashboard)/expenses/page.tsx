import Header from "@/components/header"
import { AddExpensesButton } from "@/components/expenses/add-expenses-button"
import { AddCategoryButton } from "@/components/expenses/add-category-button"
import { getExpenseCategories } from "@/actions/expenses"

export default async function Page() {
  const result = await getExpenseCategories()
  const categories = result.success
    ? result.data.map((cat) => ({ value: cat._id, label: cat.name }))
    : []

  return (
    <main className="p-4 max-w-7xl mx-auto space-y-8 w-full">
      <Header title="Expenses">
        <div className="space-x-2">
          <AddCategoryButton />
          <AddExpensesButton categories={categories} />
        </div>
      </Header>
    </main>
  )
}
