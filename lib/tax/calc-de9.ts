import { getTaxRates } from "@/lib/constants/tax-rates"
import { RoundingToCents } from "@/lib/payroll"

// Get default tax rates (2025)
const defaultRates = getTaxRates(new Date())
const SDI_RATE = defaultRates.california.sdiRate
const SUI_LIMIT = defaultRates.california.suiLimit

/**
 * Input data for DE9 calculation - a single payroll record
 */
export interface De9PayrollInput {
  employeeId: string
  grossPay: number
  stateIncomeTax: number
  sdi: number
  sui: number
  ett: number
  payPeriodEndDate: Date
}

/**
 * Result of DE9 calculation
 */
export interface De9CalcResult {
  /** Total subject wages (gross pay for all employees) */
  totalSubjectWages: number
  /** UI taxable wages (up to $7,000 per employee per year) */
  totalUiTaxableWages: number
  /** SDI taxable wages (same as subject wages, no cap) */
  totalSdiTaxableWages: number
  /** Total PIT withheld (state income tax) */
  totalPitWithheld: number
  /** Total SDI withheld */
  totalSdiWithheld: number
  /** Total UI contributions (employer paid) */
  totalUiContrib: number
  /** Total ETT contributions (employer paid) */
  totalEttContrib: number
  /** Subtotal of all contributions */
  subtotal: number
}

/**
 * Get quarterly UI taxable wages for an employee considering the annual wage base limit
 * @param currentQuarterWages Employee's gross wages for the current quarter
 * @param ytdWagesBeforeQuarter Employee's YTD wages before this quarter started
 * @returns UI taxable wages for this quarter
 */
export function getQuarterlyUITaxableWages(
  currentQuarterWages: number,
  ytdWagesBeforeQuarter: number,
): number {
  if (ytdWagesBeforeQuarter >= SUI_LIMIT) {
    // Already hit the cap
    return 0
  }

  const totalYTD = ytdWagesBeforeQuarter + currentQuarterWages
  if (totalYTD <= SUI_LIMIT) {
    // All wages this quarter are taxable
    return RoundingToCents(currentQuarterWages)
  }

  // Partial: only wages up to the cap
  return RoundingToCents(SUI_LIMIT - ytdWagesBeforeQuarter)
}

/**
 * Calculate DE9 form values from payroll data
 *
 * @param quarterPayrolls - Payroll records for the current quarter
 * @param allYtdPayrolls - All payroll records from year start to quarter end (for YTD calculation)
 * @param quarterStartDate - Start date of the quarter
 * @returns Calculated DE9 values
 */
export function calcDe9(
  quarterPayrolls: De9PayrollInput[],
  allYtdPayrolls: De9PayrollInput[],
  quarterStartDate: Date,
): De9CalcResult {
  // Group payrolls by employee to calculate YTD wages
  const employeePriorQuarterWages = new Map<string, number>()

  // Calculate each employee's wages before this quarter
  for (const payroll of allYtdPayrolls) {
    if (payroll.payPeriodEndDate < quarterStartDate) {
      const prior = employeePriorQuarterWages.get(payroll.employeeId) || 0
      employeePriorQuarterWages.set(
        payroll.employeeId,
        prior + payroll.grossPay,
      )
    }
  }

  // Calculate quarterly totals
  let totalSubjectWages = 0
  let totalUiTaxableWages = 0
  let totalPitWithheld = 0
  let totalSdiWithheld = 0
  let totalUiContrib = 0
  let totalEttContrib = 0

  // Track per-employee quarter wages for UI taxable calculation
  const employeeQuarterWages = new Map<string, number>()

  for (const payroll of quarterPayrolls) {
    // Subject wages (total gross pay)
    totalSubjectWages += payroll.grossPay

    // Accumulate per-employee quarter wages
    const quarterWages = employeeQuarterWages.get(payroll.employeeId) || 0
    employeeQuarterWages.set(
      payroll.employeeId,
      quarterWages + payroll.grossPay,
    )

    // PIT withheld (state income tax)
    totalPitWithheld += payroll.stateIncomeTax

    // SDI withheld
    totalSdiWithheld += payroll.sdi

    // UI and ETT contributions (employer paid)
    totalUiContrib += payroll.sui
    totalEttContrib += payroll.ett
  }

  // Calculate UI taxable wages (per employee, up to $7,000/year)
  for (const [employeeId, quarterWages] of employeeQuarterWages) {
    const priorWages = employeePriorQuarterWages.get(employeeId) || 0
    totalUiTaxableWages += getQuarterlyUITaxableWages(quarterWages, priorWages)
  }

  // SDI taxable wages = subject wages (no cap)
  const totalSdiTaxableWages = totalSubjectWages

  // Subtotal
  const subtotal =
    totalUiContrib + totalEttContrib + totalSdiWithheld + totalPitWithheld

  return {
    totalSubjectWages: RoundingToCents(totalSubjectWages),
    totalUiTaxableWages: RoundingToCents(totalUiTaxableWages),
    totalSdiTaxableWages: RoundingToCents(totalSdiTaxableWages),
    totalPitWithheld: RoundingToCents(totalPitWithheld),
    totalSdiWithheld: RoundingToCents(totalSdiWithheld),
    totalUiContrib: RoundingToCents(totalUiContrib),
    totalEttContrib: RoundingToCents(totalEttContrib),
    subtotal: RoundingToCents(subtotal),
  }
}

/**
 * Format EIN to DE9 format (XX XXXXXXX)
 */
export function formatEinForDe9(ein: string): string {
  const cleanEin = ein.replace(/\D/g, "")
  if (cleanEin.length === 9) {
    return `${cleanEin.slice(0, 2)} ${cleanEin.slice(2)}`
  }
  return ein
}

/**
 * Format amount to string with 2 decimal places
 * Handles -0 edge case to avoid displaying "-0.00"
 */
export function formatDe9Amount(amount: number): string {
  const result = amount.toFixed(2)
  // Convert "-0.00" to "0.00" (can occur from small negative values rounding)
  return result === "-0.00" ? "0.00" : result
}

/**
 * Format rate as percentage string (e.g., 0.034 -> "3.40")
 */
export function formatDe9Rate(rate: number): string {
  return (rate * 100).toFixed(2)
}

/**
 * Get the current SDI rate
 */
export function getSdiRate(): number {
  return SDI_RATE
}

/**
 * Get the SUI/ETT wage base limit
 */
export function getSuiLimit(): number {
  return SUI_LIMIT
}
