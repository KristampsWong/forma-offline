/**
 * Aggregations and YTD summaries — 5 functions:
 *  1. getPayrollYTDCore                ✅ implemented
 *  2. batchGetPayrollYTDCore           ✅ implemented
 *  3. getRecentPayrollActivitiesCore   (planned)
 *  4. getYearlyPayrollSummariesCore    (planned)
 *  5. getYTDNetPayCore                 (planned)
 */
import dbConnect from "@/lib/db/dbConnect"
import { parseDateParam, getYearDateRange } from "@/lib/date/utils"
import Company from "@/models/company"
import Employee from "@/models/employee"
import Payroll from "@/models/payroll"
import type { YTDData } from "@/types/payroll"
import type { PayrollRecordFromDB } from "@/lib/services/payroll/types"

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
