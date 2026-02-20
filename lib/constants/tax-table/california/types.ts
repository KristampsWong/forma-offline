import type { PayFrequency } from "@/lib/constants/employment-constants"

/**
 * California tax table type definitions
 */

type PayrollPeriod =
  | "WEEKLY"
  | "BIWEEKLY"
  | "SEMI-MONTHLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMI-ANNUAL"
  | "ANNUAL"
  | "DAILY/MISC."

/**
 * Table 1: Low Income Exemption
 */
export interface LowIncomeExemption {
  payrollPeriod: PayrollPeriod
  singleOrDualIncome: number
  marriedAllowances0or1: number
  marriedAllowances2plus: number
  unmarriedHeadOfHousehold: number
}

/**
 * Table 2: Estimated Deduction
 */
export interface EstimatedDeduction {
  allowances: number
  weekly: number
  biweekly: number
  semimonthly: number
  monthly: number
  quarterly: number
  semiAnnual: number
  annual: number
  dailyOrMisc: number
}

/**
 * Table 3: Standard Deduction
 */
export interface StandardDeduction {
  payrollPeriod: PayrollPeriod
  singleOrDualIncome: number
  marriedAllowances0or1: number
  marriedAllowances2plus: number
  unmarriedHeadOfHousehold: number
}

/**
 * Table 4: Exemption Allowance
 */
export interface ExemptionAllowance {
  allowances: number
  weekly: number
  biweekly: number
  semimonthly: number
  monthly: number
  quarterly: number
  semiAnnual: number
  annual: number
  dailyMisc: number
}

/**
 * Table 5: Tax Bracket
 */
export interface CaliforniaTaxBracket {
  min: number
  max: number
  rate: number
  baseOver: number
  baseTax: number
}

/**
 * Complete set of California tax tables for a specific year
 */
export interface CaliforniaTaxTables {
  year: number

  // Table 1: Low Income Exemption
  lowIncomeExemption: LowIncomeExemption[]

  // Table 2: Estimated Deduction
  estimatedDeduction: EstimatedDeduction[]

  // Table 3: Standard Deduction
  standardDeduction: StandardDeduction[]

  // Table 4: Exemption Allowance
  exemptionAllowance: ExemptionAllowance[]

  // Table 5: Tax Brackets by pay period and filing status
  taxBrackets: {
    monthly: {
      single: CaliforniaTaxBracket[]
      married: CaliforniaTaxBracket[]
      headOfHousehold: CaliforniaTaxBracket[]
    }
    biweekly: {
      single: CaliforniaTaxBracket[]
      married: CaliforniaTaxBracket[]
      headOfHousehold: CaliforniaTaxBracket[]
    }
  }
}

/**
 * Helper function to get number of pay periods per year
 * @return weekly 52, biweekly 26
 */
export function getNumberOfPayPeriods(period: {
  type: PayFrequency | "weekly" | "biweekly"
}): number {
  switch (period.type) {
    case "weekly":
      return 52
    case "biweekly":
      return 26
    case "monthly":
      return 12
    default:
      return 0
  }
}
