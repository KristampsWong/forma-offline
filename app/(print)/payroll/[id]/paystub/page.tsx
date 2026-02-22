import type { Metadata } from "next"
import {
  getEmployeePayrollDetails,
  getPayrollYTDByEmployeeId,
} from "@/actions/payroll"
import { calculateYTDPlusCurrent } from "@/lib/payroll"
import { formatDateParam } from "@/lib/date/utils"
import type { YTDData } from "@/types/payroll"
import { PayrollDocument } from "./PayrollDocument"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const payrollRecord = await getEmployeePayrollDetails(id)

  if (!payrollRecord.success || !payrollRecord.data) {
    return {
      title: "Payroll Record Not Found",
      description: "The requested payroll record could not be found.",
    }
  }

  const { employee, periodStart, periodEnd } = payrollRecord.data
  const employeeName = `${employee.firstName} ${employee.lastName}`
  const startDate = new Date(periodStart).toLocaleDateString("en-US")
  const endDate = new Date(periodEnd).toLocaleDateString("en-US")

  return {
    title: `${employeeName} - Pay Stub`,
    description: `Pay stub for ${employeeName} (${startDate} - ${endDate})`,
  }
}

export default async function PayrollPage({
  params,
}: // searchParams,
{
  params: Promise<{ id: string }>
  // searchParams: { [key: string]: string | undefined }
}) {
  const { id } = await params
  // const { type } = await searchParams

  const payrollRecord = await getEmployeePayrollDetails(id)
  if (!payrollRecord.success) {
    return <div>Payroll record not found or error occurred.</div>
  }
  const data = payrollRecord.data
  const ytd = (await getPayrollYTDByEmployeeId(
    data.employee.employeeId.toString(),
    formatDateParam(new Date(data.periodStart)),
  )) as {
    success: boolean
    data?: YTDData
    error?: string
    code?: string
  }
  if (!ytd.success || !ytd.data) {
    return <div>Error fetching YTD data: {ytd.error || "Unknown error"}</div>
  }

  // Calculate YTD + current data using data from getEmployeePayrollDetails
  const ytdPlusCurrent = calculateYTDPlusCurrent(ytd.data, {
    earnings: {
      regularPay: data.earnings.regularPay,
      overtimePay: data.earnings.overtimePay,
      commissionPay: data.earnings.commissionPay,
      otherPay: data.earnings.otherPay,
      totalGrossPay: data.earnings.totalGrossPay,
    },
    employeeTaxes: {
      federalIncomeTax: data.taxes.federalIncome,
      stateIncomeTax: data.taxes.californiaIncome,
      socialSecurityTax: data.taxes.socialSecurity,
      medicareTax: data.taxes.medicare,
      sdi: data.taxes.caSdi,
      total:
        data.taxes.federalIncome +
        data.taxes.socialSecurity +
        data.taxes.medicare +
        data.taxes.californiaIncome +
        data.taxes.caSdi,
    },
    employerTaxes: {
      futa: data.employerTaxes.futa,
      socialSecurityTax: data.employerTaxes.socialSecurityTax,
      medicareTax: data.employerTaxes.medicareTax,
      ett: data.employerTaxes.ett,
      sui: data.employerTaxes.sui,
      total: data.employerTaxes.total,
    },
    netPay: data.netPay,
  })
  return <PayrollDocument data={data} type={"paystub"} ytd={ytdPlusCurrent} />
}
