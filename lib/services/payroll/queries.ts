/**
 * Read operations (company + employee scoped) — 5 functions:
 *  1. getPayrollTableDataCore        ✅ implemented
 *  2. getCompanyPayrollRecordsCore   (planned)
 *  3. getPreviewPayrollCore          (planned)
 *  4. getEmployeePayrollsCore        (planned)
 *  5. getEmployeePayrollDetailsCore  (planned)
 */
import dbConnect from "@/lib/db/dbConnect"
import type { PayFrequency } from "@/lib/constants/employment-constants"
import Company from "@/models/company"
import Employee from "@/models/employee"
import Payroll from "@/models/payroll"
import { parseDateParam } from "@/lib/date/utils"
import { calculatePayrollForEmployee } from "@/lib/payroll"
import type { PayrollTableData } from "@/types/payroll"
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
    throw new Error("Company not found.")
  }

  const payType: PayFrequency = company.payFrequency

  const startDateParsed = parseDateParam(startDate)
  const endDateParsed = parseDateParam(endDate)

  if (!startDateParsed || !endDateParsed) {
    throw new Error("Invalid date format. Expected MM-DD-YYYY.")
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
      currentSalary: 1,
      payType: 1,
      currentPayMethod: 1,
      employmentStatus: 1,
      currentWorkingHours: 1,
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

      const salary = effective?.salary ?? emp.currentSalary
      const empPayType = effective?.payType ?? emp.payType
      const workingHours =
        effective?.workingHours ?? emp.currentWorkingHours ?? 40

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
