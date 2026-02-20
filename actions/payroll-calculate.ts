"use server"

import { requireAuth } from "@/lib/auth/auth-helpers"
import { getTaxRates } from "@/lib/constants/tax-rates"
import { formatDateParam } from "@/lib/date/utils"
import dbConnect from "@/lib/db/dbConnect"
import { calculatePayrollTaxesCore } from "@/lib/payroll"
import { getPayrollYTDCore } from "@/lib/services/payroll/reporting"
import Company from "@/models/company"
import type { IStateRate } from "@/models/company"
import Employee from "@/models/employee"
import type { PayFrequency } from "@/lib/constants/employment-constants"
import type { TaxCalculationResult } from "@/lib/payroll/types"

/**
 * Calculate payroll taxes for a given employee and gross pay.
 * Called from the payroll form for real-time tax recalculation.
 *
 * Returns TaxCalculationResult directly (not ActionResult) —
 * the caller handles errors via try/catch.
 */
export async function calculatePayrollTaxes(input: {
  employeeId: string
  companyId: string
  grossPay: number
  periodType: PayFrequency
  payPeriodStartDate: string
}): Promise<TaxCalculationResult> {
  const { user } = await requireAuth()
  await dbConnect()

  const { employeeId, companyId, grossPay, periodType, payPeriodStartDate } =
    input

  // Verify user owns the company
  const company = await Company.findOne({ _id: companyId, userId: user.id })
    .select("currentStateRate")
    .lean<{ currentStateRate: IStateRate }>()

  if (!company?.currentStateRate) {
    throw new Error("Company not found or missing state tax rates")
  }

  // Fetch employee tax withholding data
  const employee = await Employee.findOne({
    _id: employeeId,
    companyId,
  })
    .select("currentFederalW4 currentStateTax taxExemptions")
    .lean<{
      currentFederalW4?: InstanceType<typeof Employee>["currentFederalW4"]
      currentStateTax?: InstanceType<typeof Employee>["currentStateTax"]
      taxExemptions?: InstanceType<typeof Employee>["taxExemptions"]
    }>()

  if (!employee) {
    throw new Error("Employee not found")
  }

  // Get YTD data up to (but not including) current period
  // payPeriodStartDate is an ISO string from the client — convert to MM-DD-YYYY
  const startDateParam = formatDateParam(new Date(payPeriodStartDate))
  const ytd = await getPayrollYTDCore(user.id, employeeId, startDateParam)

  // Get tax rates for the pay period year
  const taxRates = getTaxRates(payPeriodStartDate)

  return calculatePayrollTaxesCore({
    grossPay,
    periodType,
    ytdGrossPay: ytd.salary.totalGrossPay,
    federalW4: employee.currentFederalW4,
    stateTax: employee.currentStateTax,
    companyRates: company.currentStateRate,
    taxExemptions: employee.taxExemptions,
    taxRates,
  })
}
