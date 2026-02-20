import type { TaxRates } from "./types"

/**
 * 2025 Tax Rates
 * Source: IRS Publication 15-T (2025), EDD DE 44 (2025)
 */
export const taxRates2025: TaxRates = {
  year: 2025,

  federal: {
    // Social Security - 2025
    socialSecurityWageBase: 176100,
    socialSecurityRate: 0.062, // 6.2%

    // Medicare - 2025
    medicareRate: 0.0145, // 1.45%
    medicareAdditionalRate: 0.009, // 0.9% for income above threshold
    medicareAdditionalThreshold: 200000, // $200,000 threshold

    // FUTA - 2025
    futaLimit: 7000,
    futaGrossRate: 0.06, // 6.0%
    futaCreditRate: 0.054, // 5.4% max credit
    futaNetRate: 0.006, // 0.6% net after max credit
    futaQuarterlyDepositThreshold: 500,

    // W-4 Standard Deductions - 2025
    // Used in federalWithholding calculation when Step 2 is NOT checked
    standardDeduction: {
      single: 8600,
      marriedJointly: 12900,
      headOfHousehold: 8600,
    },
  },

  california: {
    // SDI Rate - 2025
    sdiRate: 0.012, // 1.2%

    // UI/ETT Wage Base - 2025
    suiLimit: 7000,
    ettLimit: 7000,

    // FUTA Credit Reduction - CA specific
    futaCreditReductionRate: 0.012, // 1.2%
  },
}
