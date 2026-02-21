/**
 * Form 940 Service
 *
 * Creates/updates Form 940 (Annual Federal Unemployment Tax Return) from approved payrolls.
 * Called after payroll approval alongside tax payment sync.
 * Form 940 is an annual return, so it aggregates all quarters.
 */
import { getTaxRates } from "@/lib/constants/tax-rates"
import { QUARTERS, type Quarter } from "@/types/quarter"
import dbConnect from "@/lib/db/dbConnect"
import Company from "@/models/company"
import Payroll from "@/models/payroll"
import Form940 from "@/models/form940"
import { Federal940Payment } from "@/models/taxpayment"
import type { PayrollRecordFromDB } from "@/lib/services/payroll/types"
import {
  type Calc940Result,
  calc940,
  calculatePaymentsExceedingLimit,
  getQuarterlyFUTATaxableWages,
} from "@/lib/tax/calc940"
import { getQuarter, calculateForm940DueDate } from "@/lib/tax/deadlines"
import { getYearDateRange } from "@/lib/date/utils"
import { COMPANY_ERRORS } from "@/lib/constants/errors"
import type { TaxRates } from "@/lib/constants/tax-rates/types"

// ===== Types =====

interface EmployeeYearlyData {
  totalWagesForYear: number
  quarterlyWages: Record<Quarter, number>
}

interface FUTASummary {
  totalPaymentsToEmployees: number
  paymentsExceedingLimit: number
  quarterlyFUTA: Record<Quarter, number>
}

interface CreditReductionInfo {
  stateUnemploymentTaxStates: string[]
  isSubjectToCreditReduction: boolean
  creditReductionAmount: number
}

// ===== Helpers =====

/**
 * Group payroll records by employee with quarterly wage breakdown.
 */
function groupPayrollsByEmployee(
  payrolls: PayrollRecordFromDB[],
): Map<string, EmployeeYearlyData> {
  const employeeMap = new Map<string, EmployeeYearlyData>()

  for (const payroll of payrolls) {
    const employeeId = payroll.employeeId.toString()
    const grossPay = payroll.earnings.totalGrossPay || 0
    const payPeriodStart = new Date(payroll.payPeriod!.startDate)
    const quarter = getQuarter(payPeriodStart)

    if (!employeeMap.has(employeeId)) {
      employeeMap.set(employeeId, {
        totalWagesForYear: 0,
        quarterlyWages: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
      })
    }

    const data = employeeMap.get(employeeId)!
    data.totalWagesForYear += grossPay
    data.quarterlyWages[quarter] += grossPay
  }

  return employeeMap
}

/**
 * Calculate FUTA summary totals from grouped employee data.
 * Computes total payments, payments exceeding FUTA limit, and quarterly FUTA liability.
 */
function calculateFUTASummary(
  employeeMap: Map<string, EmployeeYearlyData>,
  taxRates: TaxRates,
): FUTASummary {
  let totalPaymentsToEmployees = 0
  const employeesForExceedingCalc: { totalWagesForYear: number }[] = []
  const quarterlyFUTA: Record<Quarter, number> = {
    Q1: 0,
    Q2: 0,
    Q3: 0,
    Q4: 0,
  }

  employeeMap.forEach((employee) => {
    totalPaymentsToEmployees += employee.totalWagesForYear
    employeesForExceedingCalc.push({
      totalWagesForYear: employee.totalWagesForYear,
    })

    // Calculate quarterly FUTA taxable wages for this employee
    let ytdBeforeQuarter = 0
    for (const q of QUARTERS) {
      const quarterWages = employee.quarterlyWages[q]
      if (quarterWages > 0) {
        const futaTaxableWages = getQuarterlyFUTATaxableWages(
          quarterWages,
          ytdBeforeQuarter,
        )
        quarterlyFUTA[q] += futaTaxableWages * taxRates.federal.futaNetRate
        ytdBeforeQuarter += quarterWages
      }
    }
  })

  return {
    totalPaymentsToEmployees,
    paymentsExceedingLimit: calculatePaymentsExceedingLimit(
      employeesForExceedingCalc,
    ),
    quarterlyFUTA,
  }
}

/**
 * Calculate CA FUTA credit reduction based on company state and taxable wages.
 */
function getCreditReductionInfo(
  company: { address?: { state?: string } },
  totalTaxableFUTAWages: number,
  taxRates: TaxRates,
): CreditReductionInfo {
  const stateUnemploymentTaxStates = company.address?.state
    ? [company.address.state]
    : ["CA"]

  const isSubjectToCreditReduction =
    stateUnemploymentTaxStates.includes("CA")

  const creditReductionAmount = isSubjectToCreditReduction
    ? Math.round(
        totalTaxableFUTAWages * taxRates.california.futaCreditReductionRate * 100,
      ) / 100
    : 0

  return {
    stateUnemploymentTaxStates,
    isSubjectToCreditReduction,
    creditReductionAmount,
  }
}

/**
 * Build the $set and $unset fields for the Form 940 upsert.
 */
function buildUpdateFields(
  companyId: unknown,
  year: number,
  result: Calc940Result,
  creditReduction: CreditReductionInfo,
  payrollIds: string[],
  dueDate: Date,
): { updateFields: Record<string, unknown>; unsetFields: Record<string, unknown> } {
  const updateFields: Record<string, unknown> = {
    companyId,
    year,
    stateUnemploymentTaxStates: creditReduction.stateUnemploymentTaxStates,
    isSubjectToCreditReduction: creditReduction.isSubjectToCreditReduction,
    // Part 2
    line3_totalPaymentsToEmployees: result.line3_totalPaymentsToEmployees,
    line4_exemptPayments: result.line4_exemptPayments,
    line5_paymentsExceedingLimit: result.line5_paymentsExceedingLimit,
    line6_subtotal: result.line6_subtotal,
    line7_totalTaxableFUTAWages: result.line7_totalTaxableFUTAWages,
    line8_futaTaxBeforeAdjustments: result.line8_futaTaxBeforeAdjustments,
    // Part 3
    line9_allWagesExcludedFromSUTA: false,
    line9_adjustment: result.line9_adjustment,
    line10_someWagesExcludedFromSUTA: false,
    line10_excludedWages: 0,
    line10_adjustment: result.line10_adjustment,
    line11_creditReduction: result.line11_creditReduction,
    line12_totalFUTATaxAfterAdjustments:
      result.line12_totalFUTATaxAfterAdjustments,
    // Part 4
    line13_futaTaxDeposited: result.line13_futaTaxDeposited,
    line14_balanceDue: result.line14_balanceDue,
    line15_overpayment: result.line15_overpayment,
    payrollIds,
    dueDate,
  }

  // Part 5: quarterlyLiability only required if line 12 > $500
  const unsetFields: Record<string, unknown> = {}
  if (result.line12_totalFUTATaxAfterAdjustments > 500) {
    updateFields.quarterlyLiability = result.quarterlyLiability
  } else {
    unsetFields.quarterlyLiability = ""
  }

  return { updateFields, unsetFields }
}

// ===== Main =====

/**
 * Creates or updates Form 940 based on approved payroll records for a given year.
 * Called after payroll records are approved.
 */
export async function createOrUpdateForm940FromApprovedPayrolls(
  userId: string,
  payrollPeriodEnd: Date,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await dbConnect()

    const company = await Company.findOne({ userId })
    if (!company) {
      return { success: false, error: COMPANY_ERRORS.NOT_FOUND }
    }

    const year = payrollPeriodEnd.getUTCFullYear()
    const { start: yearStartDate, end: yearEndDate } = getYearDateRange(year)

    // 1. Fetch all approved payrolls for the year
    const ytdPayrolls = (await Payroll.find({
      companyId: company._id,
      approvalStatus: "approved",
      "payPeriod.startDate": { $gte: yearStartDate, $lte: yearEndDate },
    })
      .sort({ employeeId: 1, "payPeriod.startDate": 1 })
      .lean()) as unknown as PayrollRecordFromDB[]

    if (!ytdPayrolls || ytdPayrolls.length === 0) {
      return {
        success: false,
        error: "No approved payroll records found for this year.",
      }
    }

    // 2. Group by employee + calculate FUTA summary
    const taxRates = getTaxRates(payrollPeriodEnd)
    const employeeMap = groupPayrollsByEmployee(ytdPayrolls)
    const futaSummary = calculateFUTASummary(employeeMap, taxRates)

    // 3. Get FUTA deposits already paid
    const federal940Records = await Federal940Payment.find({
      companyId: company._id,
      year,
      status: "paid",
    })
      .select("totalTax")
      .lean()

    const totalFutaDeposited = federal940Records.reduce(
      (sum, r) => sum + (r.totalTax || 0),
      0,
    )

    // 4. Credit reduction (CA)
    // Line 7 = Line 3 - Line 6 (where Line 6 = Line 4 exempt + Line 5 exceeding)
    const totalTaxableFUTAWages = Math.max(
      0,
      futaSummary.totalPaymentsToEmployees - futaSummary.paymentsExceedingLimit,
    )
    const creditReduction = getCreditReductionInfo(
      company,
      totalTaxableFUTAWages,
      taxRates,
    )

    // 5. Run calc940
    const calc940Result: Calc940Result = calc940(
      futaSummary.totalPaymentsToEmployees,
      { fringe: 0, retirement: 0, dependent: 0, other: 0 },
      futaSummary.paymentsExceedingLimit,
      false, // allWagesExcludedFromSUTA
      false, // someWagesExcludedFromSUTA
      0, // excludedWagesFromSUTA
      creditReduction.creditReductionAmount,
      totalFutaDeposited,
      {
        q1: futaSummary.quarterlyFUTA.Q1,
        q2: futaSummary.quarterlyFUTA.Q2,
        q3: futaSummary.quarterlyFUTA.Q3,
        q4: futaSummary.quarterlyFUTA.Q4,
      },
    )

    // 6. Upsert Form 940
    const payrollIds = ytdPayrolls.map((p) => p._id)
    const dueDate = calculateForm940DueDate(year)
    const { updateFields, unsetFields } = buildUpdateFields(
      company._id,
      year,
      calc940Result,
      creditReduction,
      payrollIds,
      dueDate,
    )

    const form940 = await Form940.findOneAndUpdate(
      { companyId: company._id, year },
      {
        $set: updateFields,
        ...(Object.keys(unsetFields).length > 0 && { $unset: unsetFields }),
        $setOnInsert: {
          periodStart: yearStartDate,
          periodEnd: yearEndDate,
          returnType: {
            amended: false,
            successor: false,
            noPayments: false,
            final: false,
          },
          applyOverpaymentToNextReturn: false,
          filingStatus: "ready_to_file",
          isAmended: false,
        },
      },
      { upsert: true, new: true },
    )

    // Preserve filingStatus — only update if "draft"
    if (form940.filingStatus === "draft") {
      await Form940.updateOne(
        { _id: form940._id },
        { $set: { filingStatus: "ready_to_file" } },
      )
    }

    return { success: true }
  } catch (error) {
    console.error("Error creating/updating Form 940:", error)
    return {
      success: false,
      error: "An error occurred while creating/updating Form 940.",
    }
  }
}
