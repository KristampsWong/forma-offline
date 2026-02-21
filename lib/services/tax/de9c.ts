/**
 * DE 9C Service
 *
 * Creates/updates CA DE 9C (Quarterly Contribution Return and Report of Wages - Continuation)
 * from approved payrolls. Called after payroll approval alongside tax payment sync.
 */
import dbConnect from "@/lib/db/dbConnect"
import Company from "@/models/company"
import Payroll from "@/models/payroll"
import De9c from "@/models/de9c"
import { calcDe9c, type De9cPayrollInput } from "@/lib/tax/calc-de9c"
import { getQuarterDates, getQuarterDeadlines } from "@/lib/tax/deadlines"
import { COMPANY_ERRORS } from "@/lib/constants/errors"
import type { Quarter, QuarterNumber } from "@/types/quarter"

// ===== Helpers =====

/**
 * Build company info section for DE 9C form.
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
 * Build DE 9C header data from quarter deadlines.
 * DE 9C uses a subset of the full deadline data (no quarterStarted).
 */
function buildHeaderData(
  deadlines: ReturnType<typeof getQuarterDeadlines>,
  year: number,
  quarter: QuarterNumber,
) {
  return {
    quarterEnded: deadlines.quarterEnded,
    due: deadlines.due,
    delinquent: deadlines.delinquent,
    year: String(year).slice(-2), // "25" for 2025
    quarter: String(quarter),
  }
}

// ===== Main =====

/**
 * Creates or updates DE 9C form data from approved payroll records.
 * Called after payroll records are approved.
 */
export async function createOrUpdateDe9cFormData(
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

    // 1. Get quarter date range
    const { startDate, endDate } = getQuarterDates(year, quarter)

    // 2. Fetch approved payrolls for the quarter
    const rawPayrolls = await Payroll.find({
      companyId: company._id,
      approvalStatus: "approved",
      "payPeriod.endDate": { $gte: startDate, $lte: endDate },
    })

    // 3. Build calc inputs
    const quarterPayrolls: De9cPayrollInput[] = rawPayrolls.map((p) => ({
      employeeId: p.employeeId.toString(),
      employeeInfo: {
        firstName: p.employeeInfo.firstName,
        lastName: p.employeeInfo.lastName,
        middleName: p.employeeInfo.middleName,
        ssn: p.employeeInfo.ssn,
      },
      grossPay: p.earnings?.totalGrossPay || 0,
      stateIncomeTax: p.deductions?.taxes?.stateIncomeTax || 0,
      payPeriodEndDate: new Date(p.payPeriod.endDate),
    }))

    // 4. Calculate DE 9C data
    const calcResult = calcDe9c(quarterPayrolls, year, quarter)

    // 5. Build form sections
    const deadlines = getQuarterDeadlines(year, quarter)
    const headerData = buildHeaderData(deadlines, year, quarter)
    const companyInfo = buildCompanyInfo(company)

    const quarterStr = `Q${quarter}` as Quarter
    const payrollIds = Array.from(
      new Set(rawPayrolls.map((p) => p._id.toString())),
    )

    // 6. Upsert DE 9C
    await De9c.findOneAndUpdate(
      { companyId: company._id, year, quarter: quarterStr },
      {
        $set: {
          headerData,
          companyInfo,
          employees: calcResult.employees,
          employeeCounts: calcResult.employeeCounts,
          grandTotals: calcResult.grandTotals,
          payrollIds,
          computedAt: new Date(),
        },
        $setOnInsert: {
          companyId: company._id,
          year,
          quarter: quarterStr,
          status: "computed",
        },
      },
      { upsert: true, new: true },
    )

    return { success: true }
  } catch (error) {
    console.error("Error creating/updating DE 9C form data:", error)
    return {
      success: false,
      error: "An error occurred while creating/updating DE 9C.",
    }
  }
}
