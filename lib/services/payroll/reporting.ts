import dbConnect from "@/lib/db/dbConnect"
import { parseDateParam, getYearDateRange } from "@/lib/date/utils"
import Company from "@/models/company"
import Employee from "@/models/employee"
import Payroll from "@/models/payroll"
import type { YTDData } from "@/types/payroll"
import type { PayrollRecordFromDB } from "@/lib/services/payroll/types"

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

  const zero: YTDData = {
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
    totalDeductions: 0,
    totalNetPay: 0,
    employerTotalFUTA: 0,
    employerTotalSocialSecurity: 0,
    employerTotalMedicare: 0,
    employerTotalCAETT: 0,
    employerTotalCASUI: 0,
    employerTotal: 0,
  }

  if (!payrollRecords || payrollRecords.length === 0) {
    return zero
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
  }, zero)

  ytd.employerTotal =
    ytd.employerTotalFUTA +
    ytd.employerTotalSocialSecurity +
    ytd.employerTotalMedicare +
    ytd.employerTotalCAETT +
    ytd.employerTotalCASUI

  return ytd
}
