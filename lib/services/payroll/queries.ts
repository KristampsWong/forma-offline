/**
 * Read operations (company + employee scoped) — 5 functions:
 *  1. getPayrollTableDataCore        ✅ implemented
 *  2. getCompanyPayrollRecordsCore   (planned)
 *  3. getPreviewPayrollCore          ✅ implemented
 *  4. getEmployeePayrollsCore        ✅ implemented
 *  5. getEmployeePayrollDetailsCore  (planned)
 */
import dbConnect from "@/lib/db/dbConnect"
import { COMPANY_ERRORS, PAYROLL_ERRORS } from "@/lib/constants/errors"
import type { PayFrequency } from "@/lib/constants/employment-constants"
import Company from "@/models/company"
import Employee from "@/models/employee"
import Payroll from "@/models/payroll"
import { extractDateOnly, parseDateParam } from "@/lib/date/utils"
import { calculatePayrollForEmployee, RoundingToCents } from "@/lib/payroll"
import type {
  PayrollPreviewData,
  PayrollPreviewOverview,
  PayrollTableData,
} from "@/types/payroll"
import type {
  EmployeeStub,
  PayrollRecordFromDB,
} from "@/lib/services/payroll/types"

/**
 * Core business logic for fetching payroll table data.
 * Framework-agnostic — portable to any Node.js backend.
 */
export async function getPayrollTableDataCore(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<PayrollTableData[]> {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id payFrequency")
  if (!company) {
    throw new Error(COMPANY_ERRORS.NOT_FOUND)
  }

  const payType: PayFrequency = company.payFrequency

  const startDateParsed = parseDateParam(startDate)
  const endDateParsed = parseDateParam(endDate)

  if (!startDateParsed || !endDateParsed) {
    throw new Error(PAYROLL_ERRORS.INVALID_DATE_FORMAT)
  }

  // Eligible: hired on or before period end, not terminated before period start
  const employees = await Employee.find(
    {
      companyId: company._id,
      hireDate: { $lte: endDateParsed },
      $or: [
        { terminationDate: { $exists: false } },
        { terminationDate: null },
        { terminationDate: { $gte: startDateParsed } },
      ],
    },
    {
      _id: 1,
      firstName: 1,
      lastName: 1,
      currentCompensation: 1,
      employmentStatus: 1,
      hireDate: 1,
      terminationDate: 1,
      compensationHistory: 1,
    },
  ).lean<EmployeeStub[]>()

  // Find existing payroll records for this exact pay period
  const payrollRecords = await Payroll.find({
    companyId: company._id,
    "payPeriod.startDate": startDateParsed,
    "payPeriod.endDate": endDateParsed,
  })
    .select(
      "employeeId employeeInfo.firstName employeeInfo.lastName hoursWorked.totalHours compensation.payType compensation.payRate earnings.totalGrossPay approvalStatus",
    )
    .lean<PayrollRecordFromDB[]>()

  const payrollRecordsMap = new Map<string, PayrollRecordFromDB>()
  payrollRecords.forEach((record: PayrollRecordFromDB) => {
    payrollRecordsMap.set(record.employeeId.toString(), record)
  })

  const tableData: PayrollTableData[] = employees.map((emp) => {
    const empId = emp._id.toString()
    const existingRecord = payrollRecordsMap.get(empId)

    if (existingRecord) {
      return {
        id: existingRecord.employeeId.toString(),
        payrollRecordId: existingRecord._id.toString(),
        name: `${existingRecord.employeeInfo.firstName} ${existingRecord.employeeInfo.lastName}`,
        regularPay: existingRecord.compensation.payRate,
        hours: existingRecord.hoursWorked?.totalHours || 0,
        grossPay: existingRecord.earnings.totalGrossPay,
        payType: existingRecord.compensation.payType,
        status: existingRecord.approvalStatus,
      }
    } else {
      // Find effective compensation at period end
      const history = emp.compensationHistory || []
      const sorted = [...history].sort(
        (a, b) =>
          new Date(b.effectiveDate).getTime() -
          new Date(a.effectiveDate).getTime(),
      )
      const effective = sorted.find((r) => {
        const eff = new Date(r.effectiveDate)
        const end = r.endDate ? new Date(r.endDate) : null
        return eff <= endDateParsed && (end === null || end >= endDateParsed)
      })

      const salary = effective?.salary ?? emp.currentCompensation.salary
      const empPayType = effective?.payType ?? emp.currentCompensation.payType
      const workingHours =
        effective?.workingHours || emp.currentCompensation.workingHours || 40

      const payrollData = calculatePayrollForEmployee({
        employeeId: empId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        currentSalary: salary,
        payType: empPayType,
        periodType: payType,
        startDate: startDate,
        endDate: endDate,
        weeklyHours: workingHours,
      })

      return {
        ...payrollData,
        status: "-" as const,
      }
    }
  })

  return tableData
}


export async function getPreviewPayrollCore(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<{
  data: PayrollPreviewData[]
  overview: PayrollPreviewOverview
}> {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id")
  if (!company) {
    throw new Error(COMPANY_ERRORS.NOT_FOUND)
  }

  const startDateParsed = parseDateParam(startDate)
  const endDateParsed = parseDateParam(endDate)

  if (!startDateParsed || !endDateParsed) {
    throw new Error(PAYROLL_ERRORS.INVALID_DATE_FORMAT)
  }

  const displayStart = startDate.replace(/-/g, "/")
  const displayEnd = endDate.replace(/-/g, "/")

  const payrollRecords = await Payroll.find({
    companyId: company._id,
    "payPeriod.startDate": startDateParsed,
    "payPeriod.endDate": endDateParsed,
    approvalStatus: "pending",
  })
    .select(
      "employeeId employeeInfo.firstName employeeInfo.lastName payPeriod.periodType payPeriod.payDate hoursWorked.totalHours earnings.totalGrossPay deductions.preTax.total deductions.taxes.total deductions.postTax.total employerTaxes.total netPay",
    )
    .lean<PayrollRecordFromDB[]>()

  if (!payrollRecords || payrollRecords.length === 0) {
    return {
      data: [],
      overview: {
        totalPayrollCost: 0,
        totalGrossPay: 0,
        totalEmployerTaxesAndContributions: 0,
        totalNetPay: 0,
        payPeriodStart: displayStart,
        payPeriodEnd: displayEnd,
        payDate: displayEnd,
      },
    }
  }

  let totalGrossPay = 0
  let totalEmployerTaxes = 0
  let totalNetPay = 0

  const previewData: PayrollPreviewData[] = payrollRecords.map((record) => {
    const employeeName = `${record.employeeInfo.firstName} ${record.employeeInfo.lastName}`

    const employeeTaxesAndDeductions = RoundingToCents(
      record.deductions.preTax.total +
        record.deductions.taxes.total +
        record.deductions.postTax.total,
    )

    totalGrossPay += record.earnings.totalGrossPay
    totalEmployerTaxes += record.employerTaxes.total
    totalNetPay += record.netPay

    return {
      payrollId: record._id.toString(),
      employeeId: record.employeeId.toString(),
      employeeName,
      totalHours: record.hoursWorked?.totalHours ?? 0,
      grossPay: record.earnings.totalGrossPay,
      employeeTaxesAndDeductions,
      netPay: record.netPay,
      employerTaxesAndContributions: record.employerTaxes.total,
      payFrequency: record.payPeriod?.periodType ?? "monthly",
    }
  })

  const payDate = payrollRecords[0].payPeriod?.payDate
    ? extractDateOnly(payrollRecords[0].payPeriod.payDate) ?? displayEnd
    : displayEnd

  const overview: PayrollPreviewOverview = {
    totalPayrollCost: RoundingToCents(totalGrossPay + totalEmployerTaxes),
    totalGrossPay: RoundingToCents(totalGrossPay),
    totalEmployerTaxesAndContributions: RoundingToCents(totalEmployerTaxes),
    totalNetPay: RoundingToCents(totalNetPay),
    payPeriodStart: displayStart,
    payPeriodEnd: displayEnd,
    payDate,
  }

  return {
    data: previewData,
    overview,
  }
}

/**
 * Get all payroll records for a specific employee, sorted by pay date descending.
 * Returns flattened Paycheck objects for the paycheck list view.
 */
export async function getEmployeePayrollsCore(
  userId: string,
  employeeId: string,
) {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id")
  if (!company) {
    throw new Error(COMPANY_ERRORS.NOT_FOUND)
  }

  const records = await Payroll.find({
    companyId: company._id,
    employeeId,
  })
    .select(
      "payPeriod.startDate payPeriod.endDate payPeriod.payDate earnings.totalGrossPay netPay payMethod approvalStatus",
    )
    .sort({ "payPeriod.payDate": -1 })
    .lean<PayrollRecordFromDB[]>()

  return records.map((r) => ({
    _id: r._id.toString(),
    periodStart: extractDateOnly(r.payPeriod?.startDate) ?? "",
    periodEnd: extractDateOnly(r.payPeriod?.endDate) ?? "",
    payDate: extractDateOnly(r.payPeriod?.payDate) ?? "",
    grossPay: r.earnings.totalGrossPay,
    netPay: r.netPay,
    method: r.payMethod ?? "",
    approvalStatus: r.approvalStatus,
  }))
}