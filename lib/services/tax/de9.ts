/**
 * DE 9 Service
 *
 * Creates/updates CA DE 9 (Quarterly Contribution Return and Report of Wages) from approved payrolls.
 * Called after payroll approval alongside tax payment sync.
 */
import dbConnect from "@/lib/db/dbConnect"
import Company from "@/models/company"
import Payroll from "@/models/payroll"
import De9 from "@/models/de9"
import { CAPitSdiPayment, CASuiEttPayment } from "@/models/taxpayment"
import {
  calcDe9,
  type De9PayrollInput,
  type De9CalcResult,
  formatEinForDe9,
  formatDe9Amount,
  formatDe9Rate,
  getSdiRate,
} from "@/lib/tax/calc-de9"
import { getQuarterDates, getQuarterDeadlines } from "@/lib/tax/deadlines"
import { getYearDateRange } from "@/lib/date/utils"
import { COMPANY_ERRORS } from "@/lib/constants/errors"
import type { Quarter, QuarterNumber } from "@/types/quarter"

// ===== Helpers =====

/**
 * Build company info section for DE 9 form.
 */
function buildCompanyInfo(company: {
  name: string
  address: { line1: string; line2?: string; city: string; state: string; zip: string }
  currentStateRate?: { eddAccountNumber?: string }
}) {
  return {
    name: company.name,
    address1: `${company.address.line1}${
      company.address.line2 ? ` ${company.address.line2}` : ""
    }`,
    address2: `${company.address.city} ${company.address.state} ${company.address.zip}`,
    employerAccountNumber: company.currentStateRate?.eddAccountNumber || "",
  }
}

/**
 * Get total contributions already paid for the quarter (PIT/SDI + SUI/ETT).
 */
async function getContributionsPaid(
  companyId: string,
  year: number,
  quarterStr: Quarter,
): Promise<number> {
  const [caPitSdiPayments, caSuiEttPayments] = await Promise.all([
    CAPitSdiPayment.find({
      companyId,
      year,
      quarter: quarterStr,
      status: "paid",
    })
      .select("totalTax")
      .lean(),
    CASuiEttPayment.find({
      companyId,
      year,
      quarter: quarterStr,
      status: "paid",
    })
      .select("totalTax")
      .lean(),
  ])

  let total = 0
  for (const payment of caPitSdiPayments) {
    total += payment.totalTax || 0
  }
  for (const payment of caSuiEttPayments) {
    total += payment.totalTax || 0
  }
  return total
}

/**
 * Build DE 9 form data fields from calc result and company rates.
 */
function buildFormData(
  company: {
    ein: string
    currentStateRate?: { UIRate?: number; ETTRate?: number }
  },
  calcResult: De9CalcResult,
  contributionsPaid: number,
) {
  const uiRate = company.currentStateRate?.UIRate || 0.034
  const ettRate = company.currentStateRate?.ETTRate || 0.001
  const sdiRate = getSdiRate()
  const totalDue = calcResult.subtotal - contributionsPaid

  return {
    fein: formatEinForDe9(company.ein),
    additionalFeins: ["", ""],
    uiRate: formatDe9Rate(uiRate),
    uiTaxable: formatDe9Amount(calcResult.totalUiTaxableWages),
    uiContrib: formatDe9Amount(calcResult.totalUiContrib),
    ettRate: formatDe9Rate(ettRate),
    ettContrib: formatDe9Amount(calcResult.totalEttContrib),
    sdiRate: formatDe9Rate(sdiRate),
    sdiTaxable: formatDe9Amount(calcResult.totalSdiTaxableWages),
    sdiContrib: formatDe9Amount(calcResult.totalSdiWithheld),
    subjectWages: formatDe9Amount(calcResult.totalSubjectWages),
    pitWithheld: formatDe9Amount(calcResult.totalPitWithheld),
    subtotal: formatDe9Amount(calcResult.subtotal),
    contributionsPaid: formatDe9Amount(contributionsPaid),
    totalDue: formatDe9Amount(totalDue),
    outBusinessDate: "",
  }
}

// ===== Main =====

/**
 * Creates or updates DE 9 form data from approved payroll records.
 * Called after payroll records are approved.
 */
export async function createOrUpdateDe9FormData(
  userId: string,
  year: number,
  quarter: QuarterNumber,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await dbConnect()

    const company = await Company.findOne({ userId })
    if (!company) {
      return { success: false, error: COMPANY_ERRORS.NOT_FOUND }
    }

    // 1. Get date ranges
    const { startDate, endDate } = getQuarterDates(year, quarter)
    const { start: yearStart } = getYearDateRange(year)

    // 2. Fetch YTD payrolls (year start to quarter end)
    const rawPayrolls = await Payroll.find({
      companyId: company._id,
      approvalStatus: "approved",
      "payPeriod.endDate": { $gte: yearStart, $lte: endDate },
    })

    // 3. Build calc inputs
    const allYtdPayrolls: De9PayrollInput[] = rawPayrolls.map((p) => ({
      employeeId: p.employeeId.toString(),
      grossPay: p.earnings?.totalGrossPay || 0,
      stateIncomeTax: p.deductions?.taxes?.stateIncomeTax || 0,
      sdi: p.deductions?.taxes?.sdi || 0,
      sui: p.employerTaxes?.sui || 0,
      ett: p.employerTaxes?.ett || 0,
      payPeriodEndDate: new Date(p.payPeriod.endDate),
    }))

    const quarterPayrolls = allYtdPayrolls.filter(
      (p) => p.payPeriodEndDate >= startDate && p.payPeriodEndDate <= endDate,
    )

    // 4. Calculate DE 9 data
    const calcResult = calcDe9(quarterPayrolls, allYtdPayrolls, startDate)

    // 5. Get contributions already paid
    const quarterStr = `Q${quarter}` as Quarter
    const contributionsPaid = await getContributionsPaid(
      company._id.toString(),
      year,
      quarterStr,
    )

    // 6. Build form fields
    const headerData = getQuarterDeadlines(year, quarter)
    const companyInfo = buildCompanyInfo(company)
    const formData = buildFormData(company, calcResult, contributionsPaid)

    const payrollIds = Array.from(
      new Set(rawPayrolls.map((p) => p._id.toString())),
    )

    // 7. Upsert DE 9
    await De9.findOneAndUpdate(
      { companyId: company._id, year, quarter: quarterStr },
      {
        companyId: company._id,
        year,
        quarter: quarterStr,
        headerData,
        companyInfo,
        formData,
        payrollIds,
        computedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )

    return { success: true }
  } catch (error) {
    console.error("Error creating/updating DE 9 form data:", error)
    return {
      success: false,
      error: "An error occurred while creating/updating DE 9.",
    }
  }
}
