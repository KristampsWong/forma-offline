/**
 * Tax rates type definitions
 * These types define the structure for year-specific tax rates
 */

export type TaxYear = 2025 | 2026

/**
 * Federal tax rates and limits
 */
export interface FederalTaxRates {
  // Social Security
  socialSecurityWageBase: number // e.g., 176100 for 2025
  socialSecurityRate: number // 0.062 (6.2%)

  // Medicare
  medicareRate: number // 0.0145 (1.45%)
  medicareAdditionalRate: number // 0.009 (0.9%)
  medicareAdditionalThreshold: number // 200000

  // FUTA (Federal Unemployment)
  futaLimit: number // 7000
  futaGrossRate: number // 0.06 (6.0%)
  futaCreditRate: number // 0.054 (5.4%)
  futaNetRate: number // 0.006 (0.6%)
  futaQuarterlyDepositThreshold: number // 500

  // W-4 Standard Deductions (used when Step 2 is NOT checked)
  standardDeduction: {
    single: number // 8600
    marriedJointly: number // 12900
    headOfHousehold: number // 8600
  }
}

/**
 * California state tax rates and limits
 */
export interface CaliforniaTaxRates {
  // SDI (State Disability Insurance)
  sdiRate: number // 0.012 (1.2% for 2025)

  // UI/ETT wage base limits
  suiLimit: number // 7000
  ettLimit: number // 7000

  // FUTA credit reduction (CA-specific)
  futaCreditReductionRate: number // 0.012 (1.2%)
}

/**
 * Combined tax rates for a specific year
 */
export interface TaxRates {
  year: TaxYear
  federal: FederalTaxRates
  california: CaliforniaTaxRates
}
