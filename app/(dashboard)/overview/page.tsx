import Header from "@/components/header"
import { requireAuth } from "@/lib/auth/auth-helpers"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatAmount } from "@/lib/utils"
import {
  getRecentPayrollActivities,
  getUnpaidTaxDeadlines,
  getYearlyPayrollSummaries,
  getYTDOverview,
} from "@/actions/overview"
import PayrollActivities from "@/components/overview/payroll-activities"
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const params = await searchParams
  const currentUser = await requireAuth()
  const user = currentUser.user

  // Parse month/year from URL params, default to current month
  // URL uses 1-12 for months, internally we use 0-11
  const now = new Date()
  const month =
    params.month !== undefined ? parseInt(params.month, 10) - 1 : now.getMonth()
  const year =
    params.year !== undefined ? parseInt(params.year, 10) : now.getFullYear()

  // Fetch all data in parallel for better performance
  const [payrollData, deadlinesResult, yearlyResult, ytdResult] =
    await Promise.all([
      getRecentPayrollActivities(month, year),
      getUnpaidTaxDeadlines(),
      getYearlyPayrollSummaries(year),
      getYTDOverview(year),
    ])

  const deadlines = deadlinesResult.success ? deadlinesResult.data : []
  const yearlyChartData = yearlyResult.success ? yearlyResult.data : []
  const ytd = ytdResult.success ? ytdResult.data : null

  const ytdsummary = [
    {
      title: "Net Pay",
      amount: ytd?.netPay ?? 0,
    },
    {
      title: "Federal Taxes",
      amount: ytd?.federalTaxes ?? 0,
    },
    {
      title: "State Taxes",
      amount: ytd?.stateTaxes ?? 0,
    },
    {
      title: "Total Payroll Costs",
      amount: ytd?.totalPayrollCost ?? 0,
    },
  ]
  return (
    <main className="p-4 max-w-7xl mx-auto space-y-8 w-full">
      <Header>
        <h1 className="text-2xl font-semibold">
          Welcome back, {user.name}{" "}
          <span role="img" aria-label="waving hand">
            👋🏻
          </span>
        </h1>
      </Header>
      <section className="space-y-4 w-full">
        <div className="grid grid-cols-4 gap-4 ">
          {ytdsummary.map((item) => (
            <Card className="@container/card" key={item.title}>
              <CardHeader>
                <CardDescription>{item.title}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {formatAmount(item.amount, "currency")}
                </CardTitle>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <div className="text-muted-foreground">Year to date</div>
              </CardFooter>
            </Card>
          ))}
        </div>
         <PayrollActivities data={payrollData} month={month} year={year} />
      </section>
    </main>
  )
}
