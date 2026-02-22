import { getTaxRates } from "@/lib/constants/tax-rates"
import { RoundingToCents } from "@/lib/payroll"

// Get default tax rates (2025)
const defaultRates = getTaxRates(new Date())
const SocialSecurityWageBase = defaultRates.federal.socialSecurityWageBase
const SocialSecurityRate = defaultRates.federal.socialSecurityRate
const MedicareRate = defaultRates.federal.medicareRate
const MedicareAdditionalThreshold =
  defaultRates.federal.medicareAdditionalThreshold

export interface Calc941Result {
  totalWages: number
  federalIncomeTaxWithheld: number
  line5a_socialSecurityWages: number
  line5a_socialSecurityTax: number
  line5c_medicareWagesTips: number
  line5c_medicareTax: number
  line5d_medicareWagesTipsSubjectToAdditional: number
  line5d_additionalMedicareTax: number
  line5e_totalSocialSecurityMedicareTax: number
  totalTaxesBeforeAdjustments: number
  currentQuarterAdjustments: number
  totalTaxesAfterAdjustments: number
  totalTaxesAfterAdjustmentsAndCredits: number
  totalDepositsForQuarter: number
  balanceDue: number
  overpayment: number
}
export function getTotalSSTaxableWages(
  currentQuarterWages: number,
  ytdWages: number,
): number {
  if (ytdWages >= SocialSecurityWageBase) {
    return 0
  }
  const totalWages = ytdWages + currentQuarterWages
  if (totalWages <= SocialSecurityWageBase) {
    return RoundingToCents(currentQuarterWages)
  }
  return RoundingToCents(SocialSecurityWageBase - ytdWages)
}

export function getTotalAMTWages(
  currentQuarterWages: number,
  ytdWages: number,
): number {
  const totalWages = ytdWages + currentQuarterWages

  if (ytdWages >= MedicareAdditionalThreshold) {
    return RoundingToCents(currentQuarterWages)
  }
  if (totalWages <= MedicareAdditionalThreshold) {
    return 0
  }
  return RoundingToCents(totalWages - MedicareAdditionalThreshold)
}

/**
 * Calculates the per-employee rounded tax amount for fractions of cents adjustment
 * @param currentQuarterWages Employee's gross pay for current quarter
 * @param ytdWages Employee's year-to-date gross pay
 * @returns The rounded tax amount (both employee and employer shares)
 */
export function getPerEmployeeRoundedTax(
  currentQuarterWages: number,
  ytdWages: number,
): number {
  // Calculate SS taxable wages for this employee
  const ssWage = getTotalSSTaxableWages(currentQuarterWages, ytdWages)
  const medicareWage = currentQuarterWages

  // Per-employee taxes (rounded to cents)

  const ssTax = RoundingToCents(ssWage * SocialSecurityRate)
  const medicareTax = RoundingToCents(medicareWage * MedicareRate)

  // Return both employee and employer shares
  return RoundingToCents((ssTax + medicareTax) * 2)
}

// ----------------------
// Constants for Line 16
// ----------------------
const SMALL_LIABILITY_THRESHOLD = 2500 // de minimis test
const LOOKBACK_MONTHLY_LIMIT = 50000 // <= 50k → monthly depositor
const HUNDRED_K_THRESHOLD = 100000 // $100k next-day rule

/**
 * Line 16 result matching Form 941 database schema
 */
export interface Line16Result {
  // Monthly tax liability breakdown (only for monthly depositors)
  monthlyTaxLiability?: {
    month1: number
    month2: number
    month3: number
    total: number
  }
  // Whether the company is a semiweekly schedule depositor
  isSemiweeklyScheduleDepositor: boolean
  // Schedule B data (only for semiweekly depositors)
  scheduleB?: {
    totalLiability: number
  }
  // Special flag: de minimis based on prior quarter but current >= 100k
  requireLiabilityRecord?: boolean
}

/**
 * Interface for payroll tax liability per pay date
 * Used for calculating monthly liabilities and checking $100k rule
 */
export interface PayrollTaxLiability {
  payDate: Date
  federalIncomeTax: number // FIT withheld
  employeeSocialSecurityTax: number
  employerSocialSecurityTax: number
  employeeMedicareTax: number
  employerMedicareTax: number
}

/**
 * Computes total daily tax liability for one payroll record
 */
function computeDailyLiability(p: PayrollTaxLiability): number {
  return (
    p.federalIncomeTax +
    p.employeeSocialSecurityTax +
    p.employerSocialSecurityTax +
    p.employeeMedicareTax +
    p.employerMedicareTax
  )
}

/**
 * Checks if the $100k next-day deposit rule was triggered during the quarter
 * Returns true if any single day's accumulated tax liability reached $100,000 or more
 * @param payrolls Array of payroll tax liabilities for the quarter
 */
export function checkHundredKRule(payrolls: PayrollTaxLiability[]): boolean {
  // Group tax liabilities by pay date
  const dailyLiabilities = new Map<string, number>()

  for (const p of payrolls) {
    const dateKey = p.payDate.toISOString().split("T")[0] // YYYY-MM-DD format
    const currentTotal = dailyLiabilities.get(dateKey) || 0
    const dailyLiability = computeDailyLiability(p)
    dailyLiabilities.set(dateKey, currentTotal + dailyLiability)
  }

  // Check if any day reached $100k threshold
  for (const [_, dailyTotal] of dailyLiabilities) {
    if (dailyTotal >= HUNDRED_K_THRESHOLD) {
      return true
    }
  }

  return false
}

/**
 * Calculates lookback total tax from the 4 quarters in the lookback period
 * For current year: lookback period = Q2 of prior year through Q1 of prior year
 * @param lookbackLine12Values Array of 4 Line 12 amounts from lookback period
 */
export function calculateLookbackTotalTax(
  lookbackLine12Values: number[],
): number {
  return lookbackLine12Values.reduce((sum, v) => sum + v, 0)
}

/**
 * Groups payroll records into monthly liabilities for the quarter
 * Returns [month1, month2, month3] tax liabilities
 * @param payrolls Array of payroll tax liabilities for the quarter
 */
export function getMonthlyLiabilitiesForQuarter(
  payrolls: PayrollTaxLiability[],
): [number, number, number] {
  if (payrolls.length === 0) {
    return [0, 0, 0]
  }

  // Find the earliest month in the quarter
  const dates = payrolls.map((p) => p.payDate)
  const minMonth = Math.min(...dates.map((d) => d.getUTCMonth())) // 0–11

  const sums = [0, 0, 0] // month1, month2, month3

  for (const p of payrolls) {
    const idx = p.payDate.getUTCMonth() - minMonth // 0, 1, 2 for the 3 months in this quarter
    if (idx >= 0 && idx < 3) {
      sums[idx] += computeDailyLiability(p)
    }
  }

  return [sums[0], sums[1], sums[2]]
}

/**
 * Calculates Form 941 Line 16 - Monthly Summary of Federal Tax Liability
 * Determines deposit schedule and provides required tax liability breakdown
 *
 * IRS Rules (from line16.ts):
 * 1. De minimis: Line 12 (current OR prior) < $2,500 AND no $100k rule → can pay with return
 * 2. Monthly depositor: Lookback tax <= $50,000 AND no $100k rule → complete Line 16 monthly breakdown
 * 3. Semiweekly depositor: Lookback tax > $50,000 OR $100k rule → complete Schedule B
 * 4. Special case: De minimis based on prior quarter but current >= $100k → require liability record
 *
 * @param line12Current - Current quarter's Line 12 (total tax after adjustments)
 * @param lookbackTotalTax - Total tax from 4-quarter lookback period
 * @param triggered100kRule - Whether $100k rule was triggered this quarter
 * @param rawMonthlyLiabilities - Monthly tax liabilities [month1, month2, month3]
 * @returns Line16Result matching Form 941 database schema
 */
export function calculate941Line16(
  line12Current: number,
  lookbackTotalTax: number,
  triggered100kRule: boolean,
  rawMonthlyLiabilities: [number, number, number],
): Line16Result {
  const meetsDeMinimisCurrent = line12Current < SMALL_LIABILITY_THRESHOLD

  // 1) De minimis ONLY when current quarter < 2,500 and no 100k rule
  if (meetsDeMinimisCurrent && !triggered100kRule) {
    return {
      isSemiweeklyScheduleDepositor: false,
      // no monthlyTaxLiability, this is Line 16 box 1
    }
  }

  // 2) Not de minimis: use lookback + $100k rule
  const isMonthlyDepositor =
    lookbackTotalTax <= LOOKBACK_MONTHLY_LIMIT && !triggered100kRule
  const isSemiweeklyDepositor = !isMonthlyDepositor || triggered100kRule

  if (isSemiweeklyDepositor) {
    return {
      isSemiweeklyScheduleDepositor: true,
      scheduleB: {
        totalLiability: RoundingToCents(line12Current),
      },
    }
  }

  // 3) Monthly depositor (Line 16, box 2)
  let [m1, m2, m3] = rawMonthlyLiabilities
  const sum = m1 + m2 + m3

  if (sum !== line12Current) {
    const diff = line12Current - sum
    m3 += diff
  }

  return {
    isSemiweeklyScheduleDepositor: false,
    monthlyTaxLiability: {
      month1: RoundingToCents(m1),
      month2: RoundingToCents(m2),
      month3: RoundingToCents(m3),
      total: RoundingToCents(line12Current),
    },
  }
}

/**
 * Calculates the fractions of cents adjustment for Form 941
 * This is the difference between IRS overall calculation and per-employee payroll calculations
 * @param totalSSWages Total Social Security taxable wages across all employees
 * @param totalMedicareWages Total Medicare wages across all employees
 * @param perEmployeeRoundedTotal Sum of all per-employee rounded tax amounts
 * @returns The adjustment amount
 */
export function calculateFractionsOfCentsAdjustment(
  totalSSWages: number,
  totalMedicareWages: number,
  perEmployeeRoundedTotal: number,
): number {
  const SOCIAL_SECURITY_RATE = 0.062
  const MEDICARE_RATE = 0.0145

  // IRS overall calc (both EE + ER) — rounded once
  const overall =
    Math.round(
      (totalSSWages * SOCIAL_SECURITY_RATE +
        totalMedicareWages * MEDICARE_RATE) *
        2 *
        100,
    ) / 100

  // Adjustment = overall (IRS) – per-employee (payroll)
  return RoundingToCents(overall - perEmployeeRoundedTotal)
}

export function calc941(
  currentQuarterWages: number,
  currentQuarterFederalWithholding: number,
  totalSSTaxableWage: number,
  totalAMTWages: number,
  fractionsOfCentsAdjustment: number,
  month1Deposited: number,
  month2Deposited: number,
  month3Deposited: number,
): Calc941Result {
  /** 2 */
  const totalWages = currentQuarterWages
  /** 3 */
  const federalIncomeTaxWithheld = currentQuarterFederalWithholding
  /**5a column1 */
  const socialSecurityWages = totalSSTaxableWage
  /**5a column2 */
  const socialSecurityWagesC2 = socialSecurityWages * 0.124 // 12.4%
  /**5c column1 */
  const medicareWages = currentQuarterWages
  /**5c column2 */
  const medicareWagesC2 = medicareWages * 0.029 // 2.9%
  /** 5d */
  const amt = totalAMTWages
  /** 5d column2  */
  const amtC2 = amt * 0.009 // 0.9%
  /** 5e */
  const totalSocialAndMedicare = socialSecurityWagesC2 + medicareWagesC2 + amtC2
  /** 5f Ignore */

  /** 6 */
  const totalTaxBeforeAdjustments =
    federalIncomeTaxWithheld + totalSocialAndMedicare
  /**7 */
  const currentQuarterAdjustments = fractionsOfCentsAdjustment
  /**10 */
  const totalTaxesAfterAdjustments =
    totalTaxBeforeAdjustments + currentQuarterAdjustments
  /**12 */
  let totalTaxesAfterAdjustmentsAndCredits = totalTaxesAfterAdjustments

  // Ensure non-negative tax amount
  if (totalTaxesAfterAdjustmentsAndCredits < 0) {
    totalTaxesAfterAdjustmentsAndCredits = 0
  }

  /** 13 - Total deposits for this quarter */
  const totalDeposits = month1Deposited + month2Deposited + month3Deposited

  /**14 */
  let balanceDue: number
  if (totalTaxesAfterAdjustmentsAndCredits > totalDeposits) {
    balanceDue = totalTaxesAfterAdjustmentsAndCredits - totalDeposits
  } else {
    balanceDue = 0
  }

  /** 15 */
  let overPayment: number
  if (totalDeposits > totalTaxesAfterAdjustmentsAndCredits) {
    overPayment = totalDeposits - totalTaxesAfterAdjustmentsAndCredits
  } else {
    overPayment = 0
  }

  /** 16 */

  return {
    // Line 2: Total wages
    totalWages,

    // Line 3: Federal income tax withheld
    federalIncomeTaxWithheld,

    // Line 5a: Social Security wages and tax
    line5a_socialSecurityWages: socialSecurityWages,
    line5a_socialSecurityTax: RoundingToCents(socialSecurityWagesC2),

    // Line 5c: Medicare wages and tax
    line5c_medicareWagesTips: medicareWages,
    line5c_medicareTax: RoundingToCents(medicareWagesC2),

    // Line 5d: Additional Medicare Tax
    line5d_medicareWagesTipsSubjectToAdditional: amt,
    line5d_additionalMedicareTax: RoundingToCents(amtC2),

    // Line 5e: Total Social Security and Medicare tax
    line5e_totalSocialSecurityMedicareTax: RoundingToCents(
      totalSocialAndMedicare,
    ),

    // Line 6: Total taxes before adjustments
    totalTaxesBeforeAdjustments: RoundingToCents(totalTaxBeforeAdjustments),

    // Line 7: Current quarter's adjustments (fractions of cents)
    currentQuarterAdjustments: RoundingToCents(currentQuarterAdjustments),

    // Line 10: Total taxes after adjustments
    totalTaxesAfterAdjustments: RoundingToCents(totalTaxesAfterAdjustments),

    // Line 12: Total taxes after adjustments and credits
    totalTaxesAfterAdjustmentsAndCredits: RoundingToCents(
      totalTaxesAfterAdjustmentsAndCredits,
    ),

    // Line 13: Total deposits for this quarter
    totalDepositsForQuarter: RoundingToCents(totalDeposits),

    // Line 14: Balance due
    balanceDue: RoundingToCents(balanceDue),

    // Line 15: Overpayment
    overpayment: RoundingToCents(overPayment),
  }
}
