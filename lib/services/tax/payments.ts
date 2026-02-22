/**
 * Tax Payment Sync Service
 *
 * Syncs tax payment records from approved payrolls.
 * Called after payroll approval to create/update the 4 tax payment types:
 *  - Federal941Payment (monthly) — income tax + FICA
 *  - Federal940Payment (quarterly) — FUTA
 *  - CAPitSdiPayment (monthly) — CA PIT + SDI
 *  - CASuiEttPayment (quarterly) — CA SUI + ETT
 */
import { QUARTERS, type Quarter } from "@/types/quarter"
import dbConnect from "@/lib/db/dbConnect"
import Company from "@/models/company"
import Payroll from "@/models/payroll"
import {
  Federal941Payment,
  Federal940Payment,
  CAPitSdiPayment,
  CASuiEttPayment,
} from "@/models/taxpayment"
import {
  getQuarter,
  getQuarterDateRange,
  calculate15thDueDate,
  calculateQuarterlyDueDate,
} from "@/lib/tax/deadlines"
import { getMonthDateRange } from "@/lib/date/utils"
import { COMPANY_ERRORS } from "@/lib/constants/errors"

// ===== Tax Thresholds =====

// 941: If monthly total exceeds $2,500, requires deposit
const FEDERAL_941_THRESHOLD = 2500
// 940: If accumulated FUTA exceeds $500, requires quarterly deposit
const FEDERAL_940_THRESHOLD = 500

/**
 * Calculate Federal 940 accumulated FUTA and requiresImmediatePayment per quarter.
 * Rule: Accumulate FUTA from Q1→Q4. If >$500 requires deposit. Paid quarters reset accumulation.
 *
 * @param existingPayments - Existing 940 records for the year
 * @param currentQuarter - The quarter being synced (optional, overrides DB value)
 * @param currentQuarterFuta - Latest FUTA for the current quarter (optional)
 */
function calculateFederal940RequiresImmediate(
  existingPayments: Array<{
    quarter: string
    status: string
    futaEmployer: number
  }>,
  currentQuarter?: Quarter,
  currentQuarterFuta?: number,
): Record<string, boolean> {
  const result: Record<string, boolean> = {}
  let accumulatedFuta = 0

  for (const q of QUARTERS) {
    const payment = existingPayments.find((p) => p.quarter === q)

    let futaValue = 0
    if (q === currentQuarter && currentQuarterFuta !== undefined) {
      // Current quarter being synced — use latest data, not stale DB value
      futaValue = currentQuarterFuta
    } else if (payment) {
      futaValue = payment.futaEmployer || 0
    } else {
      // No record for this quarter yet, skip
      continue
    }

    if (payment?.status === "paid") {
      // Paid quarters reset accumulation
      accumulatedFuta = 0
      result[q] = false
    } else {
      accumulatedFuta += futaValue
      result[q] = accumulatedFuta > FEDERAL_940_THRESHOLD
    }
  }

  return result
}

/**
 * Aggregate tax data from approved payrolls within a date range.
 * Uses $or to catch payrolls that overlap the period (handles edge cases).
 */
async function aggregateTaxesFromPayrolls(
  companyId: string,
  periodStart: Date,
  periodEnd: Date,
) {
  const payrolls = await Payroll.find({
    companyId,
    approvalStatus: "approved",
    $or: [
      // Payroll ends within the period
      { "payPeriod.endDate": { $gte: periodStart, $lte: periodEnd } },
      // Payroll starts within the period
      { "payPeriod.startDate": { $gte: periodStart, $lte: periodEnd } },
      // Payroll spans the entire period
      {
        "payPeriod.startDate": { $lte: periodStart },
        "payPeriod.endDate": { $gte: periodEnd },
      },
    ],
  })

  // Initialize accumulators
  let federalIncomeTax = 0
  let socialSecurityTax = 0
  let socialSecurityEmployerTax = 0
  let medicareTax = 0
  let medicareEmployerTax = 0
  let futaEmployer = 0
  let caIncomeTax = 0
  let caStateDisabilityIns = 0
  let caSuiEmployer = 0
  let caEtt = 0
  const payrollIds = []

  for (const payroll of payrolls) {
    payrollIds.push(payroll._id)

    // Federal 941 — employee taxes (from deductions.taxes)
    federalIncomeTax += payroll.deductions?.taxes?.federalIncomeTax || 0
    socialSecurityTax += payroll.deductions?.taxes?.socialSecurityTax || 0
    medicareTax += payroll.deductions?.taxes?.medicareTax || 0

    // Federal 941 — employer taxes (from employerTaxes)
    socialSecurityEmployerTax += payroll.employerTaxes?.socialSecurityTax || 0
    medicareEmployerTax += payroll.employerTaxes?.medicareTax || 0

    // Federal 940 — FUTA (from employerTaxes)
    futaEmployer += payroll.employerTaxes?.futa || 0

    // CA PIT/SDI (from deductions.taxes)
    caIncomeTax += payroll.deductions?.taxes?.stateIncomeTax || 0
    caStateDisabilityIns += payroll.deductions?.taxes?.sdi || 0

    // CA SUI/ETT (from employerTaxes)
    caSuiEmployer += payroll.employerTaxes?.sui || 0
    caEtt += payroll.employerTaxes?.ett || 0
  }

  return {
    federal941: {
      federalIncomeTax,
      socialSecurityTax,
      socialSecurityEmployerTax,
      medicareTax,
      medicareEmployerTax,
    },
    federal940: { futaEmployer },
    caPitSdi: { caIncomeTax, caStateDisabilityIns },
    caSuiEtt: { caSuiEmployer, caEtt },
    payrollIds,
  }
}

// ===== Main Sync Function =====

/**
 * Sync all tax payment records from approved payrolls for a given period.
 * Called after payroll approval.
 *
 * Note: payrollPeriodEnd is the payroll's period end date,
 * but tax records are created by calendar month (941, PIT/SDI) or quarter (940, SUI/ETT).
 *
 * @param userId - The authenticated user's ID (Better Auth)
 * @param payrollPeriodEnd - The pay period end date from the approved payrolls
 */
export async function syncAllTaxPaymentsFromApprovedPayrolls(
  userId: string,
  payrollPeriodEnd: Date,
): Promise<
  | {
      success: true
      data: {
        federal941: { id: string; totalTax: number; status: string }
        federal940: { id: string; totalTax: number; status: string }
        caPitSdi: { id: string; totalTax: number; status: string }
        caSuiEtt: { id: string; totalTax: number; status: string }
      }
    }
  | { success: false; error: string }
> {
  try {
    await dbConnect()

    const company = await Company.findOne({ userId })
    if (!company) {
      return { success: false, error: COMPANY_ERRORS.NOT_FOUND }
    }

    const companyId = company._id.toString()
    const quarter = getQuarter(payrollPeriodEnd)
    const year = payrollPeriodEnd.getUTCFullYear()

    // Monthly range (for 941, CA PIT/SDI) — calendar month, not payroll period
    const { start: monthStart, end: monthEnd } =
      getMonthDateRange(payrollPeriodEnd)

    // Quarterly range (for 940, CA SUI/ETT)
    const { start: quarterStart, end: quarterEnd } =
      getQuarterDateRange(payrollPeriodEnd)

    // 1. Federal 941 (monthly deposit)
    const monthlyTaxData = await aggregateTaxesFromPayrolls(
      companyId,
      monthStart,
      monthEnd,
    )

    const federal941DueDate = calculate15thDueDate(monthEnd)
    const federal941TotalTax =
      monthlyTaxData.federal941.federalIncomeTax +
      monthlyTaxData.federal941.socialSecurityTax +
      monthlyTaxData.federal941.socialSecurityEmployerTax +
      monthlyTaxData.federal941.medicareTax +
      monthlyTaxData.federal941.medicareEmployerTax
    const federal941RequiresImmediate =
      federal941TotalTax > FEDERAL_941_THRESHOLD

    const federal941Payment = await Federal941Payment.findOneAndUpdate(
      { companyId: companyId, periodStart: monthStart, periodEnd: monthEnd },
      {
        $set: {
          federalIncomeTax: monthlyTaxData.federal941.federalIncomeTax,
          socialSecurityTax: monthlyTaxData.federal941.socialSecurityTax,
          socialSecurityEmployerTax:
            monthlyTaxData.federal941.socialSecurityEmployerTax,
          medicareTax: monthlyTaxData.federal941.medicareTax,
          medicareEmployerTax: monthlyTaxData.federal941.medicareEmployerTax,
          totalTax: federal941TotalTax,
          payrollIds: monthlyTaxData.payrollIds,
          quarter,
          year,
          dueDate: federal941DueDate,
          requiresImmediatePayment: federal941RequiresImmediate,
        },
        $setOnInsert: {
          companyId: companyId,
          periodStart: monthStart,
          periodEnd: monthEnd,
          status: "pending",
        },
      },
      { upsert: true, new: true },
    )

    // 2. Federal 940 (quarterly deposit)
    const quarterlyTaxData = await aggregateTaxesFromPayrolls(
      companyId,
      quarterStart,
      quarterEnd,
    )

    const federal940DueDate = calculateQuarterlyDueDate(quarterEnd)

    // Query existing 940 records for the year to calculate accumulated FUTA
    const existing940Payments = await Federal940Payment.find({
      companyId: companyId,
      year,
    }).sort({ quarter: 1 })

    const requiresImmediateMap = calculateFederal940RequiresImmediate(
      existing940Payments
        .filter((p) => p.quarter != null)
        .map((p) => ({
          quarter: p.quarter!,
          status: p.status,
          futaEmployer: p.futaEmployer,
        })),
      quarter,
      quarterlyTaxData.federal940.futaEmployer,
    )
    const federal940RequiresImmediate = requiresImmediateMap[quarter] ?? false
    const federal940TotalTax = quarterlyTaxData.federal940.futaEmployer

    // Skip financial field updates if the record is already paid
    const existing940Record = existing940Payments.find(
      (p) => p.quarter === quarter,
    )
    const is940Paid = existing940Record?.status === "paid"

    const federal940SetFields: Record<string, unknown> = is940Paid
      ? {
          // Only update non-financial fields for paid records
          payrollIds: quarterlyTaxData.payrollIds,
          periodStart: quarterStart,
          periodEnd: quarterEnd,
          dueDate: federal940DueDate,
          requiresImmediatePayment: federal940RequiresImmediate,
        }
      : {
          futaEmployer: quarterlyTaxData.federal940.futaEmployer,
          totalTax: federal940TotalTax,
          payrollIds: quarterlyTaxData.payrollIds,
          periodStart: quarterStart,
          periodEnd: quarterEnd,
          dueDate: federal940DueDate,
          requiresImmediatePayment: federal940RequiresImmediate,
        }

    const federal940Payment = await Federal940Payment.findOneAndUpdate(
      { companyId: companyId, quarter, year },
      {
        $set: federal940SetFields,
        $setOnInsert: {
          companyId: companyId,
          quarter,
          year,
          status: "pending",
        },
      },
      { upsert: true, new: true },
    )

    // 3. CA PIT/SDI (monthly deposit)
    const caPitSdiDueDate = calculate15thDueDate(monthEnd)
    const caPitSdiTotalTax =
      monthlyTaxData.caPitSdi.caIncomeTax +
      monthlyTaxData.caPitSdi.caStateDisabilityIns

    const caPitSdiPayment = await CAPitSdiPayment.findOneAndUpdate(
      { companyId: companyId, periodStart: monthStart, periodEnd: monthEnd },
      {
        $set: {
          caIncomeTax: monthlyTaxData.caPitSdi.caIncomeTax,
          caStateDisabilityIns: monthlyTaxData.caPitSdi.caStateDisabilityIns,
          totalTax: caPitSdiTotalTax,
          payrollIds: monthlyTaxData.payrollIds,
          quarter,
          year,
          dueDate: caPitSdiDueDate,
        },
        $setOnInsert: {
          companyId: companyId,
          periodStart: monthStart,
          periodEnd: monthEnd,
          status: "pending",
        },
      },
      { upsert: true, new: true },
    )

    // 4. CA SUI/ETT (quarterly)
    const caSuiEttDueDate = calculateQuarterlyDueDate(quarterEnd)
    const caSuiEttTotalTax =
      quarterlyTaxData.caSuiEtt.caSuiEmployer + quarterlyTaxData.caSuiEtt.caEtt

    const caSuiEttPayment = await CASuiEttPayment.findOneAndUpdate(
      { companyId: companyId, quarter, year },
      {
        $set: {
          caSuiEmployer: quarterlyTaxData.caSuiEtt.caSuiEmployer,
          caEtt: quarterlyTaxData.caSuiEtt.caEtt,
          totalTax: caSuiEttTotalTax,
          payrollIds: quarterlyTaxData.payrollIds,
          periodStart: quarterStart,
          periodEnd: quarterEnd,
          dueDate: caSuiEttDueDate,
        },
        $setOnInsert: {
          companyId: companyId,
          quarter,
          year,
          status: "pending",
        },
      },
      { upsert: true, new: true },
    )

    return {
      success: true,
      data: {
        federal941: {
          id: federal941Payment._id.toString(),
          totalTax: federal941Payment.totalTax,
          status: federal941Payment.status,
        },
        federal940: {
          id: federal940Payment._id.toString(),
          totalTax: federal940Payment.totalTax,
          status: federal940Payment.status,
        },
        caPitSdi: {
          id: caPitSdiPayment._id.toString(),
          totalTax: caPitSdiPayment.totalTax,
          status: caPitSdiPayment.status,
        },
        caSuiEtt: {
          id: caSuiEttPayment._id.toString(),
          totalTax: caSuiEttPayment.totalTax,
          status: caSuiEttPayment.status,
        },
      },
    }
  } catch (error) {
    console.error("Error syncing tax payments:", error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to sync tax payments.",
    }
  }
}

/**
 * Recalculate requiresImmediatePayment for all 940 records in a year.
 * Call this when a quarter is marked as paid, since accumulation resets.
 */
export async function recalculateFederal940RequiresImmediatePayment(
  companyId: string,
  year: number,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await dbConnect()

    const payments = await Federal940Payment.find({
      companyId,
      year,
    }).sort({ quarter: 1 })

    if (payments.length === 0) {
      return { success: true }
    }

    const requiresImmediateMap = calculateFederal940RequiresImmediate(
      payments
        .filter((p) => p.quarter != null)
        .map((p) => ({
          quarter: p.quarter!,
          status: p.status,
          futaEmployer: p.futaEmployer,
        })),
    )

    for (const payment of payments) {
      const requiresImmediate =
        (payment.quarter && requiresImmediateMap[payment.quarter]) ?? false
      if (payment.requiresImmediatePayment !== requiresImmediate) {
        payment.requiresImmediatePayment = requiresImmediate
        await payment.save()
      }
    }

    return { success: true }
  } catch (error) {
    console.error(
      "Error recalculating Federal 940 requiresImmediatePayment:",
      error,
    )
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to recalculate.",
    }
  }
}

// ============================================================================
// Tax payment read queries
// ============================================================================

/**
 * Get all tax payment records for a company, grouped by payment type.
 * Returns serialized records for the tax payments tab.
 */
export async function getAllTaxPaymentsCore(userId: string) {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id")
  if (!company) throw new Error(COMPANY_ERRORS.NOT_FOUND)

  const filter = { companyId: company._id }

  const [fed941, fed940, caPit, caSui] = await Promise.all([
    Federal941Payment.find(filter).sort({ periodStart: -1 }).lean(),
    Federal940Payment.find(filter).sort({ year: -1, quarter: 1 }).lean(),
    CAPitSdiPayment.find(filter).sort({ periodStart: -1 }).lean(),
    CASuiEttPayment.find(filter).sort({ year: -1, quarter: 1 }).lean(),
  ])

  return {
    federal941: fed941.map((r) => ({
      _id: r._id.toString(),
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      quarter: r.quarter,
      year: r.year,
      federalIncomeTax: r.federalIncomeTax,
      socialSecurityTax: r.socialSecurityTax,
      socialSecurityEmployerTax: r.socialSecurityEmployerTax,
      medicareTax: r.medicareTax,
      medicareEmployerTax: r.medicareEmployerTax,
      totalTax: r.totalTax,
      dueDate: r.dueDate,
      status: r.status as "pending" | "paid",
      paidDate: r.paidDate,
      requiresImmediatePayment: r.requiresImmediatePayment,
    })),
    federal940: fed940.map((r) => ({
      _id: r._id.toString(),
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      quarter: r.quarter,
      year: r.year,
      futaEmployer: r.futaEmployer,
      totalTax: r.totalTax,
      dueDate: r.dueDate,
      status: r.status as "pending" | "paid",
      paidDate: r.paidDate,
      requiresImmediatePayment: r.requiresImmediatePayment,
    })),
    caPitSdi: caPit.map((r) => ({
      _id: r._id.toString(),
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      quarter: r.quarter,
      year: r.year,
      caIncomeTax: r.caIncomeTax,
      caStateDisabilityIns: r.caStateDisabilityIns,
      totalTax: r.totalTax,
      dueDate: r.dueDate,
      status: r.status as "pending" | "paid",
      paidDate: r.paidDate,
    })),
    caSuiEtt: caSui.map((r) => ({
      _id: r._id.toString(),
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      quarter: r.quarter,
      year: r.year,
      caSuiEmployer: r.caSuiEmployer,
      caEtt: r.caEtt,
      totalTax: r.totalTax,
      dueDate: r.dueDate,
      status: r.status as "pending" | "paid",
      paidDate: r.paidDate,
    })),
  }
}

/**
 * Get paginated paid payment records across all 4 payment types.
 */
export async function getPaidPaymentRecordsCore(
  userId: string,
  page: number,
  pageSize: number,
) {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id")
  if (!company) throw new Error(COMPANY_ERRORS.NOT_FOUND)

  const filter = { companyId: company._id, status: "paid" as const }

  const [fed941, fed940, caPit, caSui] = await Promise.all([
    Federal941Payment.find(filter)
      .select("periodStart periodEnd totalTax dueDate paidDate status quarter year")
      .sort({ paidDate: -1 })
      .lean(),
    Federal940Payment.find(filter)
      .select("periodStart periodEnd totalTax dueDate paidDate status quarter year")
      .sort({ paidDate: -1 })
      .lean(),
    CAPitSdiPayment.find(filter)
      .select("periodStart periodEnd totalTax dueDate paidDate status quarter year")
      .sort({ paidDate: -1 })
      .lean(),
    CASuiEttPayment.find(filter)
      .select("periodStart periodEnd totalTax dueDate paidDate status quarter year")
      .sort({ paidDate: -1 })
      .lean(),
  ])

  const allRecords = [
    ...fed941.map((r) => ({
      _id: r._id.toString(),
      title: "Federal 941",
      taxType: "federal941" as const,
      totalTax: r.totalTax,
      paidDate: r.paidDate?.toISOString(),
      dueDate: r.dueDate.toISOString(),
      quarter: r.quarter,
      year: r.year,
      status: r.status,
    })),
    ...fed940.map((r) => ({
      _id: r._id.toString(),
      title: "Federal 940",
      taxType: "federal940" as const,
      totalTax: r.totalTax,
      paidDate: r.paidDate?.toISOString(),
      dueDate: r.dueDate.toISOString(),
      quarter: r.quarter,
      year: r.year,
      status: r.status,
    })),
    ...caPit.map((r) => ({
      _id: r._id.toString(),
      title: "CA PIT/SDI",
      taxType: "caPitSdi" as const,
      totalTax: r.totalTax,
      paidDate: r.paidDate?.toISOString(),
      dueDate: r.dueDate.toISOString(),
      quarter: r.quarter,
      year: r.year,
      status: r.status,
    })),
    ...caSui.map((r) => ({
      _id: r._id.toString(),
      title: "CA SUI/ETT",
      taxType: "caSuiEtt" as const,
      totalTax: r.totalTax,
      paidDate: r.paidDate?.toISOString(),
      dueDate: r.dueDate.toISOString(),
      quarter: r.quarter,
      year: r.year,
      status: r.status,
    })),
  ].sort((a, b) => {
    if (!a.paidDate || !b.paidDate) return 0
    return new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime()
  })

  const total = allRecords.length
  const start = (page - 1) * pageSize
  const paged = allRecords.slice(start, start + pageSize)

  return {
    records: paged,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

// ============================================================================
// Tax deadline queries
// ============================================================================

export interface TaxDeadline {
  type: string
  amount: number
  dueDate: string
  status: string
}

/**
 * Get all unpaid (pending) tax payment deadlines across all 4 payment types.
 * Returns sorted by due date ascending.
 */
export async function getUnpaidTaxDeadlinesCore(
  userId: string,
): Promise<TaxDeadline[]> {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id")
  if (!company) throw new Error("Company not found.")

  const filter = { companyId: company._id, status: "pending" as const }
  const projection = "totalTax dueDate status"

  const [fed941, fed940, caPit, caSui] = await Promise.all([
    Federal941Payment.find(filter).select(projection).sort({ dueDate: 1 }).lean(),
    Federal940Payment.find(filter).select(projection).sort({ dueDate: 1 }).lean(),
    CAPitSdiPayment.find(filter).select(projection).sort({ dueDate: 1 }).lean(),
    CASuiEttPayment.find(filter).select(projection).sort({ dueDate: 1 }).lean(),
  ])

  const deadlines: TaxDeadline[] = [
    ...fed941.map((p) => ({
      type: "Federal 941",
      amount: p.totalTax,
      dueDate: p.dueDate.toISOString(),
      status: p.status,
    })),
    ...fed940.map((p) => ({
      type: "Federal 940 (FUTA)",
      amount: p.totalTax,
      dueDate: p.dueDate.toISOString(),
      status: p.status,
    })),
    ...caPit.map((p) => ({
      type: "CA PIT/SDI",
      amount: p.totalTax,
      dueDate: p.dueDate.toISOString(),
      status: p.status,
    })),
    ...caSui.map((p) => ({
      type: "CA SUI/ETT",
      amount: p.totalTax,
      dueDate: p.dueDate.toISOString(),
      status: p.status,
    })),
  ]

  return deadlines.sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  )
}
