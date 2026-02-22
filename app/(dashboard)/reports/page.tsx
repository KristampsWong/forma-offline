import { getExpenseSummaryByCategory, getMonthlyBreakdown } from "@/actions/expenses"
import Header from "@/components/header"
import { CategorySummaryTable } from "@/components/expenses/category-summary-table"
import { MonthlyBreakdownTable } from "@/components/expenses/monthly-breakdown-table"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string; year?: string }>
}) {
  const params = await searchParams

  const now = new Date()
  const currentYear = now.getFullYear()
  const year = params.year ? parseInt(params.year, 10) : currentYear

  // Default date range: Jan 1 of current year to today
  const startDate = params.startDate ?? `01/01/${currentYear}`
  const endDate = params.endDate ?? `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${currentYear}`

  const [summaryResult, breakdownResult] = await Promise.all([
    getExpenseSummaryByCategory(startDate, endDate),
    getMonthlyBreakdown(year),
  ])

  const summary = summaryResult.success ? summaryResult.data : []
  const breakdown = breakdownResult.success ? breakdownResult.data : []

  return (
    <section className="p-4 max-w-7xl mx-auto space-y-8 w-full">
      <Header title="Expense Reports" />

      {/* Category Summary */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Summary by Category</h2>
        <CategorySummaryTable
          data={summary}
          startDate={startDate}
          endDate={endDate}
        />
      </div>

      {/* Monthly Breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Monthly Breakdown</h2>
        <MonthlyBreakdownTable data={breakdown} year={year} />
      </div>
    </section>
  )
}
