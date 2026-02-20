import Header from "@/components/header"
import PayrollDateControls from "@/components/payroll/payroll-date-controls"
import { formatDateParam } from "@/lib/date/utils"
import { endOfMonth, startOfMonth } from "date-fns"
import { redirect } from "next/navigation"
import PayrollEmployeeList from "@/components/payroll/payroll-employee-list"
import { AddEmployeeButton } from "@/components/employee/add-employee-button"
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>
}) {
  const { start, end, payDate } = await searchParams

  if (!start || !end || !payDate) {
    const today = new Date()
    const s = formatDateParam(startOfMonth(today))
    const e = formatDateParam(endOfMonth(today))
    const p = formatDateParam(today)
    redirect(`/payroll?start=${s}&end=${e}&payDate=${p}`)
  }

  return (
    <section className="p-4 max-w-7xl mx-auto space-y-8 w-full">
      <Header title="Payroll" />
      <div className="flex justify-between items-center">
        <PayrollDateControls />
        <AddEmployeeButton variant="link" />
      </div>
      <PayrollEmployeeList
        // data={tableData}
        // startDate={start}
        // endDate={end}
        // payDate={payDate || end}
        // periodType={paySchedule}
        // hasEddAccount={Boolean(
        //   companyProfile?.currentStateRate?.ettAccountNumber,
        // )}
      />
    </section>
  )
}
