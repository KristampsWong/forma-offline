/**
 * Form 941 Service
 *
 * Creates/updates Form 941 (Quarterly Federal Tax Return) from approved payrolls.
 * Called after payroll approval alongside tax payment sync.
 */
import dbConnect from "@/lib/db/dbConnect"
import Company from "@/models/company"
import Payroll from "@/models/payroll"
import Form941 from "@/models/form941"
import { Federal941Payment } from "@/models/taxpayment"
import type { Quarter } from "@/types/quarter"
import type { PayrollRecordFromDB } from "@/lib/services/payroll/types"
import {
  type Calc941Result,
  calc941,
  calculate941Line16,
  calculateFractionsOfCentsAdjustment,
  calculateLookbackTotalTax,
  checkHundredKRule,
  getMonthlyLiabilitiesForQuarter,
  getPerEmployeeRoundedTax,
  getTotalAMTWages,
  getTotalSSTaxableWages,
  type Line16Result,
  type PayrollTaxLiability,
} from "@/lib/tax/calc941"
import {
  getQuarter,
  getQuarterDateRange,
  calculateQuarterlyDueDate,
} from "@/lib/tax/deadlines"
import { getYearDateRange } from "@/lib/date/utils"
import { COMPANY_ERRORS } from "@/lib/constants/errors"

// ===== Types =====

interface EmployeeQuarterlyData {
  quarterlyTotalGrossPay: number
  quarterlyFederalWithholding: number
  ytdBeforeQuarter: number
}

interface TaxTotals {
  currentQuarterWages: number
  currentQuarterFederalWithholding: number
  totalSSTaxableWage: number
  totalAMTWages: number
  totalMedicareWages: number
  perEmployeeRoundedTotal: number
  numberOfEmployees: number
}

// ===== Helpers =====

/**
 * IRS lookback period = Q3, Q4 of prior year and Q1, Q2 of current year.
 */
function getLookbackQuarters(
  year: number,
): Array<{ year: number; quarter: Quarter }> {
  return [
    { year: year - 1, quarter: "Q3" },
    { year: year - 1, quarter: "Q4" },
    { year: year, quarter: "Q1" },
    { year: year, quarter: "Q2" },
  ]
}

/**
 * Group YTD payroll records by employee, splitting wages into
 * current-quarter totals vs prior-quarter YTD.
 */
function groupPayrollsByEmployee(
  payrolls: PayrollRecordFromDB[],
  quarterStartDate: Date,
  quarterEndDate: Date,
): Map<string, EmployeeQuarterlyData> {
  const employeeMap = new Map<string, EmployeeQuarterlyData>()

  for (const payroll of payrolls) {
    const employeeId = payroll.employeeId.toString()
    const payPeriodStart = new Date(payroll.payPeriod!.startDate)
    const grossPay = payroll.earnings.totalGrossPay || 0
    const federalTax = payroll.deductions.taxes.federalIncomeTax || 0

    if (!employeeMap.has(employeeId)) {
      employeeMap.set(employeeId, {
        quarterlyTotalGrossPay: 0,
        quarterlyFederalWithholding: 0,
        ytdBeforeQuarter: 0,
      })
    }

    const data = employeeMap.get(employeeId)!

    if (
      payPeriodStart >= quarterStartDate &&
      payPeriodStart <= quarterEndDate
    ) {
      data.quarterlyTotalGrossPay += grossPay
      data.quarterlyFederalWithholding += federalTax
    } else if (payPeriodStart < quarterStartDate) {
      data.ytdBeforeQuarter += grossPay
    }
  }

  return employeeMap
}

/**
 * Calculate aggregate tax totals from grouped employee data.
 * Handles SS wage base cap, Additional Medicare threshold, and fractions-of-cents.
 */
function calculateTaxTotals(
  employeeMap: Map<string, EmployeeQuarterlyData>,
): TaxTotals {
  let currentQuarterWages = 0
  let currentQuarterFederalWithholding = 0
  let totalSSTaxableWage = 0
  let totalAMTWages = 0
  let totalMedicareWages = 0
  let perEmployeeRoundedTotal = 0
  let numberOfEmployees = 0

  employeeMap.forEach((employee) => {
    if (employee.quarterlyTotalGrossPay > 0) {
      numberOfEmployees++
    }

    currentQuarterWages += employee.quarterlyTotalGrossPay
    currentQuarterFederalWithholding += employee.quarterlyFederalWithholding

    totalSSTaxableWage += getTotalSSTaxableWages(
      employee.quarterlyTotalGrossPay,
      employee.ytdBeforeQuarter,
    )
    totalAMTWages += getTotalAMTWages(
      employee.quarterlyTotalGrossPay,
      employee.ytdBeforeQuarter,
    )
    totalMedicareWages += employee.quarterlyTotalGrossPay
    perEmployeeRoundedTotal += getPerEmployeeRoundedTax(
      employee.quarterlyTotalGrossPay,
      employee.ytdBeforeQuarter,
    )
  })

  return {
    currentQuarterWages,
    currentQuarterFederalWithholding,
    totalSSTaxableWage,
    totalAMTWages,
    totalMedicareWages,
    perEmployeeRoundedTotal,
    numberOfEmployees,
  }
}

/**
 * Build PayrollTaxLiability array from quarterly payroll records for Line 16 calculation.
 */
function buildPayrollTaxLiabilities(
  payrollRecords: PayrollRecordFromDB[],
): PayrollTaxLiability[] {
  return payrollRecords.map((payroll) => ({
    payDate: new Date(payroll.payPeriod!.payDate),
    federalIncomeTax: payroll.deductions.taxes.federalIncomeTax,
    employeeSocialSecurityTax: payroll.deductions.taxes.socialSecurityTax,
    employerSocialSecurityTax: payroll.employerTaxes.socialSecurityTax,
    employeeMedicareTax: payroll.deductions.taxes.medicareTax,
    employerMedicareTax: payroll.employerTaxes.medicareTax,
  }))
}

/**
 * Build the $set and $unset fields for the Form 941 upsert.
 */
function buildUpdateFields(
  companyId: unknown,
  year: number,
  quarter: Quarter,
  numberOfEmployees: number,
  calc941Result: Calc941Result,
  line16Result: Line16Result,
  payrollIds: string[],
  dueDate: Date,
): {
  updateFields: Record<string, unknown>
  unsetFields: Record<string, unknown>
} {
  const updateFields: Record<string, unknown> = {
    companyId,
    year,
    quarter,
    numberOfEmployees,
    // Lines 2-3
    totalWages: calc941Result.totalWages,
    federalIncomeTaxWithheld: calc941Result.federalIncomeTaxWithheld,
    // Line 5a
    line5a_socialSecurityWages: calc941Result.line5a_socialSecurityWages,
    line5a_socialSecurityTax: calc941Result.line5a_socialSecurityTax,
    line5b_socialSecurityTips: 0,
    line5b_socialSecurityTipsTax: 0,
    // Line 5c
    line5c_medicareWagesTips: calc941Result.line5c_medicareWagesTips,
    line5c_medicareTax: calc941Result.line5c_medicareTax,
    // Line 5d
    line5d_medicareWagesTipsSubjectToAdditional:
      calc941Result.line5d_medicareWagesTipsSubjectToAdditional,
    line5d_additionalMedicareTax: calc941Result.line5d_additionalMedicareTax,
    // Line 5e-5f
    line5e_totalSocialSecurityMedicareTax:
      calc941Result.line5e_totalSocialSecurityMedicareTax,
    line5f_section3121qNoticeDemand: 0,
    // Lines 6-15
    currentQuarterAdjustments: calc941Result.currentQuarterAdjustments,
    totalTaxesBeforeAdjustments: calc941Result.totalTaxesBeforeAdjustments,
    totalTaxesAfterAdjustmentsAndCredits:
      calc941Result.totalTaxesAfterAdjustmentsAndCredits,
    totalDepositsForQuarter: calc941Result.totalDepositsForQuarter,
    balanceDue: calc941Result.balanceDue,
    overpayment: calc941Result.overpayment,
    // Line 16
    isSemiweeklyScheduleDepositor:
      line16Result.isSemiweeklyScheduleDepositor,
    payrollIds,
    dueDate,
  }

  // Handle optional Line 16 fields — set or unset based on depositor type
  if (line16Result.monthlyTaxLiability) {
    updateFields.monthlyTaxLiability = line16Result.monthlyTaxLiability
  }
  if (line16Result.scheduleB) {
    updateFields.scheduleB = line16Result.scheduleB
  }

  const unsetFields: Record<string, unknown> = {}
  if (!line16Result.monthlyTaxLiability) {
    unsetFields.monthlyTaxLiability = ""
  }
  if (!line16Result.scheduleB) {
    unsetFields.scheduleB = ""
  }

  return { updateFields, unsetFields }
}

// ===== Main =====

/**
 * Creates or updates Form 941 based on approved payroll records for a given pay period.
 * Called after payroll records are approved.
 */
export async function createOrUpdateForm941FromApprovedPayrolls(
  userId: string,
  payrollPeriodEnd: Date,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await dbConnect()

    const company = await Company.findOne({ userId })
    if (!company) {
      return { success: false, error: COMPANY_ERRORS.NOT_FOUND }
    }

    // Determine quarter and date ranges
    const quarter = getQuarter(payrollPeriodEnd)
    const year = payrollPeriodEnd.getUTCFullYear()
    const { start: quarterStartDate, end: quarterEndDate } =
      getQuarterDateRange(payrollPeriodEnd)

    // 1. Fetch quarterly payroll records
    const payrollRecords = (await Payroll.find({
      companyId: company._id,
      approvalStatus: "approved",
      "payPeriod.startDate": {
        $gte: quarterStartDate,
        $lte: quarterEndDate,
      },
    })
      .sort({ employeeId: 1, "payPeriod.startDate": 1 })
      .lean()) as unknown as PayrollRecordFromDB[]

    if (!payrollRecords || payrollRecords.length === 0) {
      return {
        success: false,
        error: "No approved payroll records found for this quarter.",
      }
    }

    // 2. Fetch YTD payroll records (year start to end of quarter)
    const { start: ytdStartDate } = getYearDateRange(year)

    const ytdPayrollRecords = (await Payroll.find({
      companyId: company._id,
      approvalStatus: "approved",
      "payPeriod.startDate": {
        $gte: ytdStartDate,
        $lte: quarterEndDate,
      },
    })
      .sort({ employeeId: 1, "payPeriod.startDate": 1 })
      .lean()) as unknown as PayrollRecordFromDB[]

    // 3. Group by employee + calculate tax totals
    const employeeMap = groupPayrollsByEmployee(
      ytdPayrollRecords,
      quarterStartDate,
      quarterEndDate,
    )
    const taxTotals = calculateTaxTotals(employeeMap)

    const fractionsOfCentsAdjustment = calculateFractionsOfCentsAdjustment(
      taxTotals.totalSSTaxableWage,
      taxTotals.totalMedicareWages,
      taxTotals.perEmployeeRoundedTotal,
    )

    // 4. Get deposits already paid this quarter
    const federal941Records = await Federal941Payment.find({
      companyId: company._id,
      year,
      quarter,
      status: "paid",
    })
      .select("totalTax periodStart")
      .sort({ periodStart: 1 })
      .lean()

    // Map deposits by month using periodStart, not positional index
    const quarterStartMonth = quarterStartDate.getUTCMonth()
    const depositByMonth = [0, 0, 0] // [month1, month2, month3]
    for (const rec of federal941Records) {
      const recMonth = new Date(rec.periodStart).getUTCMonth()
      const idx = recMonth - quarterStartMonth
      if (idx >= 0 && idx < 3) {
        depositByMonth[idx] = rec.totalTax || 0
      }
    }
    const [month1, month2, month3] = depositByMonth

    // 5. Run calc941
    const calc941Result: Calc941Result = calc941(
      taxTotals.currentQuarterWages,
      taxTotals.currentQuarterFederalWithholding,
      taxTotals.totalSSTaxableWage,
      taxTotals.totalAMTWages,
      fractionsOfCentsAdjustment,
      month1,
      month2,
      month3,
    )

    // 6. Calculate Line 16 (deposit schedule)
    const payrollTaxLiabilities = buildPayrollTaxLiabilities(payrollRecords)
    const triggered100kRule = checkHundredKRule(payrollTaxLiabilities)
    const rawMonthlyLiabilities =
      getMonthlyLiabilitiesForQuarter(payrollTaxLiabilities)

    // Lookback period: prior 4 quarters for depositor determination
    const lookbackQuarters = getLookbackQuarters(year)
    const lookbackForms = await Form941.find({
      companyId: company._id,
      $or: lookbackQuarters.map((q) => ({
        year: q.year,
        quarter: q.quarter,
      })),
    })
      .select("year quarter totalTaxesAfterAdjustmentsAndCredits")
      .lean()

    const lookbackLine12Values = lookbackQuarters.map((q) => {
      const form = lookbackForms.find(
        (f) => f.year === q.year && f.quarter === q.quarter,
      )
      return form?.totalTaxesAfterAdjustmentsAndCredits || 0
    })

    const line16Result: Line16Result = calculate941Line16(
      calc941Result.totalTaxesAfterAdjustmentsAndCredits,
      calculateLookbackTotalTax(lookbackLine12Values),
      triggered100kRule,
      rawMonthlyLiabilities,
    )

    // 7. Upsert Form 941
    const dueDate = calculateQuarterlyDueDate(quarterEndDate)
    const payrollIds = payrollRecords.map((p) => p._id)
    const { updateFields, unsetFields } = buildUpdateFields(
      company._id,
      year,
      quarter,
      taxTotals.numberOfEmployees,
      calc941Result,
      line16Result,
      payrollIds,
      dueDate,
    )

    const form941 = await Form941.findOneAndUpdate(
      { companyId: company._id, year, quarter },
      {
        $set: updateFields,
        ...(Object.keys(unsetFields).length > 0 && { $unset: unsetFields }),
        $setOnInsert: {
          periodStart: quarterStartDate,
          periodEnd: quarterEndDate,
          taxableWagesNotSubjectToSSMedicare: false,
          currentQuarterTipsAdjustment: 0,
          currentQuarterGroupTermLifeInsuranceAdjustment: 0,
          qualifiedSmallBusinessPayrollTaxCredit: 0,
          applyOverpaymentToNextReturn: false,
          filingStatus: "ready_to_file",
          isAmended: false,
        },
      },
      { upsert: true, new: true },
    )

    // Preserve filingStatus — only update if "draft"
    if (form941.filingStatus === "draft") {
      await Form941.updateOne(
        { _id: form941._id },
        { $set: { filingStatus: "ready_to_file" } },
      )
    }

    return { success: true }
  } catch (error) {
    console.error("Error creating/updating Form 941:", error)
    return {
      success: false,
      error: "An error occurred while creating/updating Form 941.",
    }
  }
}

// ============================================================================
// Read queries
// ============================================================================

/**
 * Get all Form 941 filings for a company, sorted by year desc then quarter.
 */
export async function getAllForm941FilingsCore(userId: string) {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id")
  if (!company) throw new Error(COMPANY_ERRORS.NOT_FOUND)

  const records = await Form941.find({ companyId: company._id })
    .select(
      "quarter year periodStart periodEnd dueDate filingStatus filedDate balanceDue",
    )
    .sort({ year: -1, quarter: 1 })
    .lean()

  return records.map((r) => ({
    _id: r._id.toString(),
    quarter: r.quarter,
    year: r.year,
    periodStart: r.periodStart.toISOString(),
    periodEnd: r.periodEnd.toISOString(),
    dueDate: r.dueDate.toISOString(),
    filingStatus: r.filingStatus,
    filedDate: r.filedDate?.toISOString(),
    balanceDue: r.balanceDue,
  }))
}

/**
 * Get paginated filed filing records across all form types (941, 940, DE9, DE9C).
 */
export async function getFiledFilingRecordsCore(
  userId: string,
  page: number,
  pageSize: number,
) {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id")
  if (!company) throw new Error(COMPANY_ERRORS.NOT_FOUND)

  const filter = { companyId: company._id, filingStatus: "filed" }
  const skip = (page - 1) * pageSize

  const [records, total] = await Promise.all([
    Form941.find(filter)
      .select(
        "quarter year periodStart periodEnd dueDate filingStatus filedDate balanceDue",
      )
      .sort({ filedDate: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    Form941.countDocuments(filter),
  ])

  return {
    records: records.map((r) => ({
      _id: r._id.toString(),
      formType: "941" as const,
      title: "Form 941",
      quarter: r.quarter,
      year: r.year,
      periodStart: r.periodStart.toISOString(),
      periodEnd: r.periodEnd.toISOString(),
      dueDate: r.dueDate.toISOString(),
      filingStatus: r.filingStatus,
      filedDate: r.filedDate?.toISOString(),
      amount: r.balanceDue,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
