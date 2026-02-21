import { getTaxRates } from "@/lib/constants/tax-rates"
import { RoundingToCents } from "@/lib/payroll"

// Get default tax rates (2025)
const defaultRates = getTaxRates(new Date())
const FUTA_LIMIT = defaultRates.federal.futaLimit
const FUTA_NET_RATE = defaultRates.federal.futaNetRate
const FUTA_CREDIT_RATE = defaultRates.federal.futaCreditRate
const FUTA_QUARTERLY_DEPOSIT_THRESHOLD =
  defaultRates.federal.futaQuarterlyDepositThreshold

/**
 * Form 940 - Employer's Annual Federal Unemployment (FUTA) Tax Return
 *
 * FUTA tax rate: 6.0% on the first $7,000 of wages paid to each employee
 * Most employers can claim a credit up to 5.4% for state unemployment taxes,
 * resulting in a net FUTA rate of 0.6%
 */

/**
 * Result of Form 940 calculation
 */
export interface Calc940Result {
  // Part 2 - Determine your FUTA tax before adjustments
  line3_totalPaymentsToEmployees: number
  line4_exemptPayments: {
    fringe: number
    retirement: number
    dependent: number
    other: number
    total: number
  }
  line5_paymentsExceedingLimit: number
  line6_subtotal: number
  line7_totalTaxableFUTAWages: number
  line8_futaTaxBeforeAdjustments: number

  // Part 3 - Adjustments
  line9_adjustment: number // If ALL wages excluded from SUTA
  line10_adjustment: number // If SOME wages excluded from SUTA
  line11_creditReduction: number // Credit reduction states
  line12_totalFUTATaxAfterAdjustments: number

  // Part 4 - Balance due or overpayment
  line13_futaTaxDeposited: number
  line14_balanceDue: number
  line15_overpayment: number

  // Part 5 - Quarterly liability breakdown
  quarterlyLiability: {
    q1: number
    q2: number
    q3: number
    q4: number
    total: number
  }
}

/**
 * Input for per-employee FUTA calculation
 */
export interface EmployeeFUTAInput {
  employeeId: string
  totalWagesForYear: number // Total wages paid to this employee for the year
  ytdFUTAWagesBeforeQuarter: number // YTD FUTA taxable wages before current quarter
}

import type { Quarter } from "@/types/quarter"

/**
 * Input for quarterly FUTA calculation
 */
export interface QuarterlyFUTAInput {
  quarter: Quarter
  totalWages: number
  futaTaxableWages: number
  futaTax: number
}

/**
 * Calculate FUTA taxable wages for a single employee
 * FUTA is only on the first $7,000 of wages per employee per year
 *
 * @param totalWagesForYear Total wages paid to this employee for the year
 * @returns FUTA taxable wages (capped at $7,000)
 */
export function getEmployeeFUTATaxableWages(totalWagesForYear: number): number {
  return Math.min(totalWagesForYear, FUTA_LIMIT)
}

/**
 * Calculate payments exceeding FUTA limit (Line 5)
 * This is the total amount of wages paid to each employee that exceeds $7,000
 *
 * @param employees Array of employee wage data
 * @returns Total payments exceeding FUTA limit across all employees
 */
export function calculatePaymentsExceedingLimit(
  employees: { totalWagesForYear: number }[],
): number {
  let total = 0
  for (const emp of employees) {
    if (emp.totalWagesForYear > FUTA_LIMIT) {
      total += emp.totalWagesForYear - FUTA_LIMIT
    }
  }
  return RoundingToCents(total)
}

/**
 * Calculate FUTA tax for the year (before adjustments)
 * Uses the net rate of 0.6% (assuming full state credit)
 *
 * @param taxableFUTAWages Total FUTA taxable wages (Line 7)
 * @param rate FUTA tax rate (default: 0.6%)
 * @returns FUTA tax before adjustments (Line 8)
 */
export function calculateFUTATaxBeforeAdjustments(
  taxableFUTAWages: number,
  rate: number = FUTA_NET_RATE,
): number {
  return RoundingToCents(taxableFUTAWages * rate)
}

/**
 * Calculate SUTA exclusion adjustment (Line 9 or Line 10)
 * If wages were excluded from state unemployment tax, additional FUTA is owed
 *
 * @param excludedWages Wages excluded from state unemployment tax
 * @returns Adjustment amount (excluded wages × 5.4%)
 */
export function calculateSUTAExclusionAdjustment(
  excludedWages: number,
): number {
  return RoundingToCents(excludedWages * FUTA_CREDIT_RATE)
}

/**
 * Calculate credit reduction adjustment (Line 11)
 * Some states have outstanding federal loans and require additional FUTA
 *
 * @param creditReductionStates Array of credit reduction state data
 * @returns Total credit reduction amount
 */
export function calculateCreditReduction(
  creditReductionStates: {
    state: string
    creditReductionRate: number
    wages: number
  }[],
): number {
  let total = 0
  for (const state of creditReductionStates) {
    total += state.wages * state.creditReductionRate
  }
  return RoundingToCents(total)
}

/**
 * Check if quarterly FUTA deposit is required
 * Deposit is required if accumulated FUTA tax liability exceeds $500
 *
 * @param accumulatedFUTATax Accumulated FUTA tax liability for the year so far
 * @returns Whether a deposit is required
 */
export function requiresQuarterlyDeposit(accumulatedFUTATax: number): boolean {
  return accumulatedFUTATax > FUTA_QUARTERLY_DEPOSIT_THRESHOLD
}

/**
 * Calculate quarterly FUTA liability breakdown (Part 5)
 * Required only if Line 12 is more than $500
 *
 * @param quarterlyData Array of quarterly FUTA data
 * @returns Quarterly liability breakdown
 */
export function calculateQuarterlyLiability(
  quarterlyData: QuarterlyFUTAInput[],
): {
  q1: number
  q2: number
  q3: number
  q4: number
  total: number
} {
  const liability = { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 }

  for (const q of quarterlyData) {
    const tax = RoundingToCents(q.futaTax)
    switch (q.quarter) {
      case "Q1":
        liability.q1 = tax
        break
      case "Q2":
        liability.q2 = tax
        break
      case "Q3":
        liability.q3 = tax
        break
      case "Q4":
        liability.q4 = tax
        break
    }
  }

  liability.total = RoundingToCents(
    liability.q1 + liability.q2 + liability.q3 + liability.q4,
  )
  return liability
}

/**
 * Determine if FUTA payment requires immediate deposit
 * Used for calculating requiresImmediatePayment flag for Federal940Payment
 *
 * Rule: If accumulated FUTA tax at end of quarter exceeds $500,
 * deposit is due by the last day of the month following the quarter
 *
 * @param payments Array of quarterly FUTA payment records
 * @returns Map of quarter to requiresImmediatePayment status
 */
export function calculateFederal940RequiresImmediate(
  payments: { quarter: string; futaOwed: number; amountPaid: number }[],
): Record<string, boolean> {
  const result: Record<string, boolean> = {}
  let accumulated = 0

  // Sort by quarter
  const sorted = [...payments].sort((a, b) => {
    const qOrder = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 }
    return (
      (qOrder[a.quarter as keyof typeof qOrder] || 0) -
      (qOrder[b.quarter as keyof typeof qOrder] || 0)
    )
  })

  for (const payment of sorted) {
    // Add current quarter's liability
    accumulated += payment.futaOwed - payment.amountPaid

    // Check if deposit is required (exceeds $500 threshold)
    const requiresImmediate = accumulated > FUTA_QUARTERLY_DEPOSIT_THRESHOLD

    result[payment.quarter] = requiresImmediate

    // If a deposit was made, reset accumulation
    if (payment.amountPaid > 0) {
      accumulated = Math.max(0, accumulated)
    }
  }

  return result
}

/**
 * Main Form 940 calculation function
 * Calculates all lines of Form 940 based on annual payroll data
 */
export function calc940(
  // Part 2 inputs
  totalPaymentsToEmployees: number,
  exemptPayments: {
    fringe?: number
    retirement?: number
    dependent?: number
    other?: number
  },
  paymentsExceedingLimit: number,
  // Part 3 inputs
  allWagesExcludedFromSUTA: boolean,
  someWagesExcludedFromSUTA: boolean,
  excludedWagesFromSUTA: number,
  creditReductionAmount: number,
  // Part 4 inputs
  futaTaxDeposited: number,
  // Part 5 inputs
  quarterlyLiability: {
    q1: number
    q2: number
    q3: number
    q4: number
  },
): Calc940Result {
  // Part 2 - Calculate FUTA tax before adjustments
  const line4_exemptPayments = {
    fringe: exemptPayments.fringe ?? 0,
    retirement: exemptPayments.retirement ?? 0,
    dependent: exemptPayments.dependent ?? 0,
    other: exemptPayments.other ?? 0,
    total: 0,
  }
  line4_exemptPayments.total = RoundingToCents(
    line4_exemptPayments.fringe +
      line4_exemptPayments.retirement +
      line4_exemptPayments.dependent +
      line4_exemptPayments.other,
  )

  const line5 = paymentsExceedingLimit
  const line6 = RoundingToCents(line4_exemptPayments.total + line5)
  const line7 = RoundingToCents(Math.max(0, totalPaymentsToEmployees - line6))
  const line8 = calculateFUTATaxBeforeAdjustments(line7)

  // Part 3 - Adjustments
  let line9_adjustment = 0
  let line10_adjustment = 0

  if (allWagesExcludedFromSUTA) {
    // Line 9: ALL wages excluded from SUTA
    line9_adjustment = RoundingToCents(line7 * FUTA_CREDIT_RATE)
  } else if (someWagesExcludedFromSUTA && excludedWagesFromSUTA > 0) {
    // Line 10: SOME wages excluded from SUTA
    line10_adjustment = calculateSUTAExclusionAdjustment(excludedWagesFromSUTA)
  }

  const line11 = creditReductionAmount
  const line12 = RoundingToCents(
    line8 + line9_adjustment + line10_adjustment + line11,
  )

  // Part 4 - Balance due or overpayment
  const line13 = futaTaxDeposited
  let line14 = 0
  let line15 = 0

  if (line12 > line13) {
    line14 = RoundingToCents(line12 - line13)
  } else if (line13 > line12) {
    line15 = RoundingToCents(line13 - line12)
  }

  // Part 5 - Quarterly liability
  const quarterlyLiabilityResult = {
    q1: RoundingToCents(quarterlyLiability.q1),
    q2: RoundingToCents(quarterlyLiability.q2),
    q3: RoundingToCents(quarterlyLiability.q3),
    q4: RoundingToCents(quarterlyLiability.q4),
    total: RoundingToCents(
      quarterlyLiability.q1 +
        quarterlyLiability.q2 +
        quarterlyLiability.q3 +
        quarterlyLiability.q4,
    ),
  }

  return {
    // Part 2
    line3_totalPaymentsToEmployees: RoundingToCents(totalPaymentsToEmployees),
    line4_exemptPayments,
    line5_paymentsExceedingLimit: line5,
    line6_subtotal: line6,
    line7_totalTaxableFUTAWages: line7,
    line8_futaTaxBeforeAdjustments: line8,

    // Part 3
    line9_adjustment,
    line10_adjustment,
    line11_creditReduction: line11,
    line12_totalFUTATaxAfterAdjustments: line12,

    // Part 4
    line13_futaTaxDeposited: line13,
    line14_balanceDue: line14,
    line15_overpayment: line15,

    // Part 5
    quarterlyLiability: quarterlyLiabilityResult,
  }
}

/**
 * Helper: Calculate FUTA taxable wages for a single quarter
 * Takes into account YTD wages to properly cap at $7,000 per employee
 *
 * @param currentQuarterWages Wages paid this quarter
 * @param ytdWagesBeforeQuarter YTD wages before this quarter
 * @returns FUTA taxable wages for this quarter
 */
export function getQuarterlyFUTATaxableWages(
  currentQuarterWages: number,
  ytdWagesBeforeQuarter: number,
): number {
  if (ytdWagesBeforeQuarter >= FUTA_LIMIT) {
    // Already hit the cap
    return 0
  }

  const totalYTD = ytdWagesBeforeQuarter + currentQuarterWages
  if (totalYTD <= FUTA_LIMIT) {
    // All wages this quarter are taxable
    return RoundingToCents(currentQuarterWages)
  }

  // Partial: only wages up to the cap
  return RoundingToCents(FUTA_LIMIT - ytdWagesBeforeQuarter)
}

/**
 * Calculate total FUTA taxable wages across all employees for a quarter
 *
 * @param employees Array of employee data with current and YTD wages
 * @returns Total FUTA taxable wages for the quarter
 */
export function calculateQuarterlyFUTATaxableWages(
  employees: {
    currentQuarterWages: number
    ytdWagesBeforeQuarter: number
  }[],
): number {
  let total = 0
  for (const emp of employees) {
    total += getQuarterlyFUTATaxableWages(
      emp.currentQuarterWages,
      emp.ytdWagesBeforeQuarter,
    )
  }
  return RoundingToCents(total)
}
