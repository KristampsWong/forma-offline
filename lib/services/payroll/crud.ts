/**
 * Single-record CRUD operations — 3 functions:
 *  1. createPayrollRecordCore    ✅ implemented
 *  2. getPayrollRecordByIdCore   (planned)
 *  3. updatePayrollRecordCore    (planned)
 */
import dbConnect from "@/lib/db/dbConnect"
import Company from "@/models/company"
import Employee from "@/models/employee"
import Payroll from "@/models/payroll"
import { formatDateParam, parseDateParam } from "@/lib/date/utils"
import {
  calculateHours,
  calculateGrossPay,
  calculatePayrollTaxesCore,
} from "@/lib/payroll"
import { getTaxRates } from "@/lib/constants/tax-rates"
import { COMPANY_ERRORS, EMPLOYEE_ERRORS, PAYROLL_ERRORS } from "@/lib/constants/errors"
import { getPayrollYTDCore } from "@/lib/services/payroll/reporting"
import { buildPayrollRecord } from "@/lib/services/payroll/builders"
import type { PayFrequency } from "@/lib/constants/employment-constants"
import type { TaxCalculationInput } from "@/lib/payroll/types"
import type { IPayroll } from "@/models/payroll"
import type { IEmployeeAddress } from "@/models/employee"
import type { LeanDoc } from "@/types/db"
import type { PayrollRecord } from "@/types/payroll"

export async function createPayrollRecordCore(
  userId: string,
  employeeId: string,
  startDate: string,
  endDate: string,
  payDate: string,
  hours?: number,
): Promise<{ payrollId: string; employeeId: string }> {
  await dbConnect()

  // 1. Look up company by userId (service layer pattern)
  const company = await Company.findOne({ userId })
  if (!company) {
    throw new Error(COMPANY_ERRORS.NOT_FOUND)
  }

  if (!company.currentStateRate) {
    throw new Error(PAYROLL_ERRORS.MISSING_STATE_RATES)
  }

  // 2. Find the employee
  const employee = await Employee.findOne({
    _id: employeeId,
    companyId: company._id,
  })
  if (!employee) {
    throw new Error(EMPLOYEE_ERRORS.NOT_FOUND)
  }

  // 3. Parse and validate dates (MM-DD-YYYY from URL params)
  const startDateObj = parseDateParam(startDate)
  const endDateObj = parseDateParam(endDate)
  const payDateObj = parseDateParam(payDate)

  if (!startDateObj || !endDateObj || !payDateObj) {
    throw new Error(PAYROLL_ERRORS.INVALID_DATE_FORMAT)
  }

  if (payDateObj < startDateObj) {
    throw new Error(PAYROLL_ERRORS.PAY_DATE_BEFORE_START)
  }

  // 4. Check for existing exact match payroll record
  const exactMatch = await Payroll.findOne({
    companyId: company._id,
    employeeId: employee._id,
    "payPeriod.startDate": startDateObj,
    "payPeriod.endDate": endDateObj,
  })

  if (exactMatch) {
    exactMatch.payPeriod.payDate = payDateObj
    await exactMatch.save()
    return {
      payrollId: exactMatch._id.toString(),
      employeeId: employeeId,
    }
  }

  // 5. Check for overlapping periods
  const overlapping = await Payroll.findOne({
    companyId: company._id,
    employeeId: employee._id,
    "payPeriod.startDate": { $lte: endDateObj },
    "payPeriod.endDate": { $gte: startDateObj },
  })

  if (overlapping) {
    throw new Error(PAYROLL_ERRORS.OVERLAPPING_PERIOD)
  }

  // 6. Calculate hours and gross pay
  const payFrequency = company.payFrequency
  const { salary, workingHours } = employee.currentCompensation

  const totalHours =
    hours !== undefined
      ? hours
      : calculateHours(workingHours, {
          type: payFrequency,
          startDate: startDateObj,
          endDate: endDateObj,
        })

  const grossPay = calculateGrossPay(salary, totalHours)

  // 7. Calculate YTD and taxes
  const ytdResult = await getPayrollYTDCore(userId, employeeId, startDate)
  const taxRates = getTaxRates(startDateObj)
  const taxResult = calculatePayrollTaxesCore({
    grossPay,
    periodType: payFrequency,
    ytdGrossPay: ytdResult.salary.totalGrossPay,
    federalW4: employee.currentFederalW4,
    stateTax: employee.currentStateTax,
    companyRates: company.currentStateRate,
    taxExemptions: employee.taxExemptions,
    taxRates,
  })

  // 8. Create payroll record with denormalized snapshots
  const payrollRecord = new Payroll(
    buildPayrollRecord({
      companyId: company._id.toString(),
      employee,
      payPeriod: {
        periodType: payFrequency,
        startDate: startDateObj,
        endDate: endDateObj,
        payDate: payDateObj,
      },
      hoursWorked: {
        regularHours: totalHours,
        overtimeHours: 0,
        totalHours,
      },
      earnings: {
        regularPay: grossPay,
        overtimePay: 0,
        bonusPay: 0,
        commissionPay: 0,
        otherPay: 0,
        totalGrossPay: grossPay,
      },
      taxResult,
    }),
  )

  await payrollRecord.save()

  return {
    payrollId: payrollRecord._id.toString(),
    employeeId: employee._id.toString(),
  }
}


/**
 * Get payroll record by ID core logic
 */
export async function getPayrollRecordByIdCore(
  userId: string,
  payrollId: string
): Promise<PayrollRecord & { paySchedule: PayFrequency }> {
  await dbConnect()

  const company = await Company.findOne({ userId }).select(
    "currentStateRate.UIRate currentStateRate.ETTRate payFrequency"
  )
  if (!company) {
    throw new Error(COMPANY_ERRORS.NOT_FOUND)
  }

  const payrollRecord = await Payroll.findById(payrollId)
    .select("-employeeInfo.ssn -employeeInfo.email -approvalInfo")
    .lean<LeanDoc<IPayroll>>()

  if (!payrollRecord) {
    throw new Error(PAYROLL_ERRORS.NOT_FOUND)
  }

  if (company._id.toString() !== payrollRecord.companyId.toString()) {
    throw new Error(PAYROLL_ERRORS.ACCESS_DENIED)
  }

  const employee = (await Employee.findById(payrollRecord.employeeId)
    .select("address")
    .lean()) as { address: IEmployeeAddress } | null

  const defaultAddress: IEmployeeAddress = {
    street1: "",
    city: "",
    state: "",
    zipCode: "",
  }

  const serialized = JSON.parse(JSON.stringify(payrollRecord))

  return {
    ...serialized,
    address: employee?.address || defaultAddress,
    companyRates: {
      uiRate: company.currentStateRate?.UIRate || 0.034,
      ettRate: company.currentStateRate?.ETTRate || 0.001,
    },
    paySchedule: company.payFrequency,
  } as PayrollRecord & { paySchedule: PayFrequency }
}




/**
 * Update payroll record with server-side tax validation.
 * Fetches YTD internally and recalculates taxes to prevent tampering.
 */
export async function updatePayrollRecordCore(
  userId: string,
  payrollId: string,
  updateData: {
    hoursWorked: {
      regularHours: number
      overtimeHours: number
      totalHours: number
    }
    earnings: PayrollRecord["earnings"]
    deductions: {
      taxes: PayrollRecord["deductions"]["taxes"]
    }
    employerTaxes: PayrollRecord["employerTaxes"]
    netPay: number
  }
): Promise<void> {
  await dbConnect()

  const company = await Company.findOne({ userId })
  if (!company) {
    throw new Error(COMPANY_ERRORS.NOT_FOUND)
  }

  if (!company.currentStateRate) {
    throw new Error(PAYROLL_ERRORS.MISSING_STATE_RATES)
  }

  const payrollRecord = await Payroll.findOne({
    _id: payrollId,
    companyId: company._id,
  })
  if (!payrollRecord) {
    throw new Error(PAYROLL_ERRORS.NOT_FOUND)
  }

  if (payrollRecord.approvalStatus === "approved") {
    throw new Error(PAYROLL_ERRORS.CANNOT_MODIFY_APPROVED)
  }

  // Fetch YTD for accurate tax recalculation
  const startDateParam = formatDateParam(payrollRecord.payPeriod.startDate)
  const ytdResult = await getPayrollYTDCore(
    userId,
    payrollRecord.employeeId.toString(),
    startDateParam,
  )

  // Server-side tax recalculation
  // Snapshot types lack submittedDate (metadata-only), safe to cast
  const serverCalculated = calculatePayrollTaxesCore({
    grossPay: updateData.earnings.totalGrossPay,
    periodType: payrollRecord.payPeriod.periodType as PayFrequency,
    ytdGrossPay: ytdResult.salary.totalGrossPay,
    federalW4: payrollRecord.federalW4 as TaxCalculationInput["federalW4"],
    stateTax: (payrollRecord.californiaDE4
      ? {
          state: "CA" as const,
          californiaDE4: payrollRecord.californiaDE4,
          effectiveDate: payrollRecord.californiaDE4.effectiveDate,
        }
      : undefined) as TaxCalculationInput["stateTax"],
    companyRates: company.currentStateRate,
    taxExemptions: payrollRecord.taxExemptions,
    taxRates: getTaxRates(payrollRecord.payPeriod.startDate),
  })

  // Validate frontend-submitted taxes against server calculation
  const tolerance = 0.01
  const employeeTaxDiff = Math.abs(
    updateData.deductions.taxes.total - serverCalculated.employeeTaxes.total
  )
  const employerTaxDiff = Math.abs(
    updateData.employerTaxes.total - serverCalculated.employerTaxes.total
  )
  const netPayDiff = Math.abs(updateData.netPay - serverCalculated.netPay)

  if (
    employeeTaxDiff > tolerance ||
    employerTaxDiff > tolerance ||
    netPayDiff > tolerance
  ) {
    throw new Error(PAYROLL_ERRORS.TAX_CALCULATION_MISMATCH)
  }

  // Update with server-calculated tax values (ignore client-submitted taxes)
  await Payroll.findByIdAndUpdate(payrollId, {
    "hoursWorked.regularHours": updateData.hoursWorked.regularHours,
    "hoursWorked.overtimeHours": updateData.hoursWorked.overtimeHours,
    "hoursWorked.totalHours": updateData.hoursWorked.totalHours,
    earnings: updateData.earnings,
    "deductions.taxes": serverCalculated.employeeTaxes,
    employerTaxes: serverCalculated.employerTaxes,
    netPay: serverCalculated.netPay,
    updatedAt: new Date(),
  })
}