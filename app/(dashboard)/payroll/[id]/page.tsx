import {
  getPayrollRecordById,
  getPayrollYTDByEmployeeId,
} from "@/actions/payroll"
import PayrollForm from "@/components/payroll/payroll-form"
import { formatDateParam } from "@/lib/date/utils"

function ErrorMessage({ message }: { message: string }) {
  return (
    <section className="p-4 mx-auto max-w-5xl space-y-16 w-full">
      <div className="text-center text-destructive">{message}</div>
    </section>
  )
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const payrollRecord = await getPayrollRecordById(id)

  if (!payrollRecord.success) {
    return <ErrorMessage message={payrollRecord.error || "Unknown error"} />
  }

  const startDateParam = formatDateParam(new Date(payrollRecord.data.payPeriod.startDate))
  const payrollYTDRecords = await getPayrollYTDByEmployeeId(
    payrollRecord.data.employeeId,
    startDateParam,
  )

  if (!payrollYTDRecords.success) {
    return <ErrorMessage message={payrollYTDRecords.error || "Unknown error"} />
  }

  return (
    <section className="p-4 mx-auto max-w-5xl space-y-16 w-full">
      <PayrollForm
        payrollRecord={payrollRecord.data}
        ytd={payrollYTDRecords.data}
      />
    </section>
  )
}
