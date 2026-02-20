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
import { getPayrollYTDCore } from "@/lib/services/payroll/reporting"
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
    throw new Error("Company not found.")
  }

  if (!company.currentStateRate) {
    throw new Error("Company is missing state tax rates.")
  }

  // 2. Find the employee
  const employee = await Employee.findOne({
    _id: employeeId,
    companyId: company._id,
  })
  if (!employee) {
    throw new Error("Employee not found.")
  }

  // 3. Parse and validate dates (MM-DD-YYYY from URL params)
  const startDateObj = parseDateParam(startDate)
  const endDateObj = parseDateParam(endDate)
  const payDateObj = parseDateParam(payDate)

  if (!startDateObj || !endDateObj || !payDateObj) {
    throw new Error("Invalid date format. Expected MM-DD-YYYY.")
  }

  if (payDateObj < endDateObj) {
    throw new Error("Pay date cannot be before period end date.")
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
    throw new Error("Pay period overlaps with an existing record.")
  }

  // 6. Calculate hours and gross pay
  const payFrequency = company.payFrequency
  const { salary, payType, workingHours } = employee.currentCompensation

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
  const taxResult = calculatePayrollTaxesCore({
    grossPay,
    periodType: payFrequency,
    ytdGrossPay: ytdResult.salary.totalGrossPay,
    federalW4: employee.currentFederalW4,
    stateTax: employee.currentStateTax,
    companyRates: company.currentStateRate,
    taxExemptions: employee.taxExemptions,
  })

  // 8. Create payroll record with denormalized snapshots
  const payrollRecord = new Payroll({
    companyId: company._id,
    employeeId: employee._id,
    employeeInfo: {
      firstName: employee.firstName,
      lastName: employee.lastName,
      middleName: employee.middleName,
      ssn: employee.ssn,
      email: employee.email,
    },
    payPeriod: {
      periodType: payFrequency,
      startDate: startDateObj,
      endDate: endDateObj,
      payDate: payDateObj,
    },
    hoursWorked: {
      regularHours: totalHours,
      overtimeHours: 0,
      doubleTimeHours: 0,
      sickHours: 0,
      vacationHours: 0,
      holidayHours: 0,
      totalHours: totalHours,
    },
    compensation: {
      payType: payType,
      payRate: salary,
      workingHours: workingHours,
    },
    payMethod: employee.currentPayMethod.payMethod,
    federalW4: employee.currentFederalW4
      ? {
          formVersion: employee.currentFederalW4.formVersion,
          filingStatus: employee.currentFederalW4.filingStatus,
          multipleJobsOrSpouseWorks:
            employee.currentFederalW4.multipleJobsOrSpouseWorks,
          claimedDependentsDeduction:
            employee.currentFederalW4.claimedDependentsDeduction,
          otherIncome: employee.currentFederalW4.otherIncome,
          deductions: employee.currentFederalW4.deductions,
          extraWithholding: employee.currentFederalW4.extraWithholding,
          effectiveDate: employee.currentFederalW4.effectiveDate,
        }
      : undefined,
    californiaDE4: employee.currentStateTax?.californiaDE4
      ? {
          filingStatus: employee.currentStateTax.californiaDE4.filingStatus,
          worksheetA: employee.currentStateTax.californiaDE4.worksheetA,
          worksheetB: employee.currentStateTax.californiaDE4.worksheetB,
          additionalWithholding:
            employee.currentStateTax.californiaDE4.additionalWithholding,
          exempt: employee.currentStateTax.californiaDE4.exempt,
          wagesPlanCode: employee.currentStateTax.californiaDE4.wagesPlanCode,
          effectiveDate: employee.currentStateTax.californiaDE4.effectiveDate,
        }
      : undefined,
    taxExemptions: {
      futa: employee.taxExemptions?.futa || false,
      fica: employee.taxExemptions?.fica || false,
      suiEtt: employee.taxExemptions?.suiEtt || false,
      sdi: employee.taxExemptions?.sdi || false,
    },
    earnings: {
      regularPay: grossPay,
      overtimePay: 0,
      bonusPay: 0,
      commissionPay: 0,
      otherPay: 0,
      totalGrossPay: grossPay,
    },
    deductions: {
      preTax: {
        retirement401k: 0,
        healthInsurance: 0,
        dentalInsurance: 0,
        visionInsurance: 0,
        hsaFsa: 0,
        other: 0,
        total: 0,
      },
      taxes: taxResult.employeeTaxes,
      postTax: {
        garnishments: 0,
        unionDues: 0,
        charitableDonations: 0,
        other: 0,
        total: 0,
      },
    },
    employerTaxes: taxResult.employerTaxes,
    netPay: taxResult.netPay,
    approvalStatus: "pending",
  })

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
    throw new Error("Company not found.")
  }

  const payrollRecord = await Payroll.findById(payrollId)
    .select("-employeeInfo.ssn -employeeInfo.email -approvalInfo")
    .lean<LeanDoc<IPayroll>>()

  if (!payrollRecord) {
    throw new Error("Payroll record not found.")
  }

  if (company._id.toString() !== payrollRecord.companyId.toString()) {
    throw new Error("Access denied to this payroll record.")
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
    throw new Error("Company not found.")
  }

  if (!company.currentStateRate) {
    throw new Error("Company is missing state tax rates.")
  }

  const payrollRecord = await Payroll.findOne({
    _id: payrollId,
    companyId: company._id,
  })
  if (!payrollRecord) {
    throw new Error("Payroll record not found.")
  }

  if (payrollRecord.approvalStatus === "approved") {
    throw new Error("Cannot modify an approved payroll record.")
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
    throw new Error(
      "Tax calculation mismatch. Please refresh the page and try again."
    )
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