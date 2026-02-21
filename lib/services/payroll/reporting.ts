/**
 * Aggregations and YTD summaries:
 *  1. getPayrollYTDCore                — per-employee YTD for payroll editing
 *  2. batchGetPayrollYTDCore           — batch YTD for multiple employees
 *  3. getYTDOverviewCore               — company-wide YTD totals for dashboard
 *  4. getYearlyPayrollSummariesCore    — monthly chart data for dashboard
 *  5. getRecentPayrollActivitiesCore   — recent payroll records for dashboard
 */
import dbConnect from "@/lib/db/dbConnect"
import { parseDateParam, getYearDateRange } from "@/lib/date/utils"
import Company from "@/models/company"
import Employee from "@/models/employee"
import Payroll from "@/models/payroll"
import type { YTDData } from "@/types/payroll"
import type { PayrollRecordFromDB } from "@/lib/services/payroll/types"

// --- Overview types ---

export interface YTDOverview {
  netPay: number
  totalPayrollCost: number
  federalTaxes: number
  stateTaxes: number
}

export interface MonthlySummary {
  month: number // 0-11
  grossPay: number
  netPay: number
  employerTaxes: number
}

export interface PayrollActivityItem {
  _id: string
  employeeId: string
  employeeName: string
  grossPay: number
  employeeTaxes: number
  netPay: number
  employerTaxes: number
  totalPayrollCost: number
  status: string
}

export interface PayrollActivitiesResult {
  activities: PayrollActivityItem[]
  stats: {
    approvedCount: number
    pendingCount: number
    totalPayrollCost: number
    hasEmployee: boolean
  }
}

const createZero = (): YTDData => ({
  salary: {
    regularPay: 0,
    overtimePay: 0,
    commissionPay: 0,
    otherPay: 0,
    totalGrossPay: 0,
  },
  totalFederalTax: 0,
  totalStateTax: 0,
  totalSocialSecurity: 0,
  totalMedicare: 0,
  totalSDI: 0,
  totalEmployeeTaxes: 0,
  totalDeductions: 0,
  totalNetPay: 0,
  employerTotalFUTA: 0,
  employerTotalSocialSecurity: 0,
  employerTotalMedicare: 0,
  employerTotalCAETT: 0,
  employerTotalCASUI: 0,
  employerTotal: 0,
})

export async function getPayrollYTDCore(
  userId: string,
  employeeId: string,
  startDate: string,
): Promise<YTDData> {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id")
  if (!company) {
    throw new Error("Company not found.")
  }

  const employee = await Employee.findOne({
    _id: employeeId,
    companyId: company._id,
  }).select("_id")
  if (!employee) {
    throw new Error("Employee not found.")
  }

  const startDateObj = parseDateParam(startDate)
  if (!startDateObj) {
    throw new Error("Invalid date format. Expected MM-DD-YYYY.")
  }

  // YTD: Jan 1 of the pay period's year through (but not including) this period
  const { start: yearStart } = getYearDateRange(startDateObj.getFullYear())

  const payrollRecords = await Payroll.find({
    companyId: company._id,
    employeeId,
    "payPeriod.startDate": {
      $gte: yearStart,
      $lt: startDateObj,
    },
    approvalStatus: "approved",
  })
    .select(
      "earnings deductions.preTax.total deductions.taxes deductions.postTax.total employerTaxes netPay",
    )
    .lean<PayrollRecordFromDB[]>()

  if (!payrollRecords || payrollRecords.length === 0) {
    return createZero()
  }

  const ytd = payrollRecords.reduce((acc, record) => {
    acc.salary.regularPay += record.earnings.regularPay
    acc.salary.overtimePay += record.earnings.overtimePay
    acc.salary.commissionPay += record.earnings.commissionPay
    acc.salary.otherPay += record.earnings.otherPay
    acc.salary.totalGrossPay += record.earnings.totalGrossPay

    acc.totalFederalTax += record.deductions.taxes.federalIncomeTax
    acc.totalStateTax += record.deductions.taxes.stateIncomeTax
    acc.totalSocialSecurity += record.deductions.taxes.socialSecurityTax
    acc.totalMedicare += record.deductions.taxes.medicareTax
    acc.totalSDI += record.deductions.taxes.sdi
    acc.totalDeductions +=
      record.deductions.preTax.total + record.deductions.postTax.total
    acc.totalNetPay += record.netPay

    acc.employerTotalFUTA += record.employerTaxes.futa
    acc.employerTotalSocialSecurity += record.employerTaxes.socialSecurityTax
    acc.employerTotalMedicare += record.employerTaxes.medicareTax
    acc.employerTotalCAETT += record.employerTaxes.ett
    acc.employerTotalCASUI += record.employerTaxes.sui

    return acc
  }, createZero())

  ytd.totalEmployeeTaxes =
    ytd.totalFederalTax +
    ytd.totalStateTax +
    ytd.totalSocialSecurity +
    ytd.totalMedicare +
    ytd.totalSDI

  ytd.employerTotal =
    ytd.employerTotalFUTA +
    ytd.employerTotalSocialSecurity +
    ytd.employerTotalMedicare +
    ytd.employerTotalCAETT +
    ytd.employerTotalCASUI

  return ytd
}

/**
 * Batch YTD for multiple employees in a single query.
 * Skips company/employee lookups — caller must provide validated companyId and employeeIds.
 */
export async function batchGetPayrollYTDCore(
  companyId: string,
  employeeIds: string[],
  startDateObj: Date,
): Promise<Map<string, YTDData>> {
  const { start: yearStart } = getYearDateRange(startDateObj.getFullYear())

  const payrollRecords = await Payroll.find({
    companyId,
    employeeId: { $in: employeeIds },
    "payPeriod.startDate": {
      $gte: yearStart,
      $lt: startDateObj,
    },
    approvalStatus: "approved",
  })
    .select(
      "employeeId earnings deductions.preTax.total deductions.taxes deductions.postTax.total employerTaxes netPay",
    )
    .lean<PayrollRecordFromDB[]>()

  // Group records by employeeId
  const grouped = new Map<string, PayrollRecordFromDB[]>()
  for (const record of payrollRecords) {
    const empId = record.employeeId.toString()
    const list = grouped.get(empId)
    if (list) {
      list.push(record)
    } else {
      grouped.set(empId, [record])
    }
  }

  // Reduce each group into YTDData
  const result = new Map<string, YTDData>()
  for (const empId of employeeIds) {
    const records = grouped.get(empId)
    if (!records || records.length === 0) {
      result.set(empId, createZero())
      continue
    }

    const ytd = records.reduce((acc, record) => {
      acc.salary.regularPay += record.earnings.regularPay
      acc.salary.overtimePay += record.earnings.overtimePay
      acc.salary.commissionPay += record.earnings.commissionPay
      acc.salary.otherPay += record.earnings.otherPay
      acc.salary.totalGrossPay += record.earnings.totalGrossPay

      acc.totalFederalTax += record.deductions.taxes.federalIncomeTax
      acc.totalStateTax += record.deductions.taxes.stateIncomeTax
      acc.totalSocialSecurity += record.deductions.taxes.socialSecurityTax
      acc.totalMedicare += record.deductions.taxes.medicareTax
      acc.totalSDI += record.deductions.taxes.sdi
      acc.totalDeductions +=
        record.deductions.preTax.total + record.deductions.postTax.total
      acc.totalNetPay += record.netPay

      acc.employerTotalFUTA += record.employerTaxes.futa
      acc.employerTotalSocialSecurity += record.employerTaxes.socialSecurityTax
      acc.employerTotalMedicare += record.employerTaxes.medicareTax
      acc.employerTotalCAETT += record.employerTaxes.ett
      acc.employerTotalCASUI += record.employerTaxes.sui

      return acc
    }, createZero())

    ytd.totalEmployeeTaxes =
      ytd.totalFederalTax +
      ytd.totalStateTax +
      ytd.totalSocialSecurity +
      ytd.totalMedicare +
      ytd.totalSDI

    ytd.employerTotal =
      ytd.employerTotalFUTA +
      ytd.employerTotalSocialSecurity +
      ytd.employerTotalMedicare +
      ytd.employerTotalCAETT +
      ytd.employerTotalCASUI

    result.set(empId, ytd)
  }

  return result
}

// ============================================================================
// Overview / Dashboard aggregations
// ============================================================================

/**
 * Company-wide YTD totals for the dashboard summary cards.
 * Uses MongoDB aggregation for a single efficient query.
 */
export async function getYTDOverviewCore(
  userId: string,
  year: number,
): Promise<YTDOverview> {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id")
  if (!company) throw new Error("Company not found.")

  const { start, end } = getYearDateRange(year)

  const result = await Payroll.aggregate([
    {
      $match: {
        companyId: company._id,
        "payPeriod.startDate": { $gte: start, $lte: end },
        approvalStatus: "approved",
      },
    },
    {
      $group: {
        _id: null,
        netPay: { $sum: "$netPay" },
        totalGrossPay: { $sum: "$earnings.totalGrossPay" },
        employerTotal: { $sum: "$employerTaxes.total" },
        federalIncomeTax: { $sum: "$deductions.taxes.federalIncomeTax" },
        socialSecurityTax: { $sum: "$deductions.taxes.socialSecurityTax" },
        medicareTax: { $sum: "$deductions.taxes.medicareTax" },
        stateIncomeTax: { $sum: "$deductions.taxes.stateIncomeTax" },
        sdi: { $sum: "$deductions.taxes.sdi" },
      },
    },
  ])

  if (!result.length) {
    return { netPay: 0, totalPayrollCost: 0, federalTaxes: 0, stateTaxes: 0 }
  }

  const r = result[0]
  return {
    netPay: r.netPay,
    totalPayrollCost: r.totalGrossPay + r.employerTotal,
    federalTaxes: r.federalIncomeTax + r.socialSecurityTax + r.medicareTax,
    stateTaxes: r.stateIncomeTax + r.sdi,
  }
}

/**
 * Monthly payroll summaries for the year — used for dashboard charts.
 * Returns one entry per month that has approved payrolls.
 */
export async function getYearlyPayrollSummariesCore(
  userId: string,
  year: number,
): Promise<MonthlySummary[]> {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id")
  if (!company) throw new Error("Company not found.")

  const { start, end } = getYearDateRange(year)

  const result = await Payroll.aggregate([
    {
      $match: {
        companyId: company._id,
        "payPeriod.startDate": { $gte: start, $lte: end },
        approvalStatus: "approved",
      },
    },
    {
      $group: {
        _id: { $month: "$payPeriod.startDate" },
        grossPay: { $sum: "$earnings.totalGrossPay" },
        netPay: { $sum: "$netPay" },
        employerTaxes: { $sum: "$employerTaxes.total" },
      },
    },
    { $sort: { _id: 1 } },
  ])

  return result.map((r: { _id: number; grossPay: number; netPay: number; employerTaxes: number }) => ({
    month: r._id - 1, // MongoDB $month is 1-12, convert to 0-11
    grossPay: r.grossPay,
    netPay: r.netPay,
    employerTaxes: r.employerTaxes,
  }))
}

/**
 * Payroll records for a given month with stats — dashboard activity table.
 * Includes both approved and pending records.
 */
export async function getRecentPayrollActivitiesCore(
  userId: string,
  month: number,
  year: number,
): Promise<PayrollActivitiesResult> {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id")
  if (!company) throw new Error("Company not found.")

  const monthStart = new Date(Date.UTC(year, month, 1))
  const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999))

  const [records, employeeCount] = await Promise.all([
    Payroll.find({
      companyId: company._id,
      "payPeriod.startDate": { $gte: monthStart, $lte: monthEnd },
    })
      .select(
        "employeeId employeeInfo.firstName employeeInfo.lastName earnings.totalGrossPay deductions.taxes.total employerTaxes.total netPay approvalStatus",
      )
      .sort({ "payPeriod.payDate": -1 })
      .lean<PayrollRecordFromDB[]>(),
    Employee.countDocuments({ companyId: company._id }),
  ])

  let approvedCount = 0
  let pendingCount = 0
  let approvedPayrollCost = 0

  const activities: PayrollActivityItem[] = records.map((r) => {
    const grossPay = r.earnings.totalGrossPay
    const employerTaxes = r.employerTaxes.total

    if (r.approvalStatus === "approved") {
      approvedCount++
      approvedPayrollCost += grossPay + employerTaxes
    } else {
      pendingCount++
    }

    return {
      _id: r._id.toString(),
      employeeId: r.employeeId.toString(),
      employeeName: `${r.employeeInfo.firstName} ${r.employeeInfo.lastName}`,
      grossPay,
      employeeTaxes: r.deductions.taxes.total,
      netPay: r.netPay,
      employerTaxes,
      totalPayrollCost: grossPay + employerTaxes,
      status: r.approvalStatus,
    }
  })

  return {
    activities,
    stats: {
      approvedCount,
      pendingCount,
      totalPayrollCost: approvedPayrollCost,
      hasEmployee: employeeCount > 0,
    },
  }
}
