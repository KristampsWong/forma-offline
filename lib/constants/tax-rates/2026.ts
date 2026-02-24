import type { TaxRates } from "./types"

/**
 * 2026 Tax Rates
 * Source: IRS Publication 15-T (2026), IRS Publication 15 (2026), EDD DE 44 (2026)
 */
export const taxRates2026: TaxRates = {
  year: 2026,

  federal: {
    // Social Security - 2026
    socialSecurityWageBase: 184500,
    socialSecurityRate: 0.062, // 6.2%

    // Medicare - 2026
    medicareRate: 0.0145, // 1.45%
    medicareAdditionalRate: 0.009, // 0.9% for income above threshold
    medicareAdditionalThreshold: 200000, // $200,000 threshold

    // FUTA - 2026
    futaLimit: 7000,
    futaGrossRate: 0.06, // 6.0%
    futaCreditRate: 0.054, // 5.4% max credit
    futaNetRate: 0.006, // 0.6% net after max credit
    futaQuarterlyDepositThreshold: 500,

    // W-4 Standard Deductions - 2026 (Pub 15-T Worksheet 1A, Step 1(g))
    // Used in federalWithholding calculation when Step 2 is NOT checked
    standardDeduction: {
      single: 8600,
      marriedJointly: 12900,
      headOfHousehold: 8600,
    },
  },

  california: {
    // SDI Rate - 2026 (up from 1.2% in 2025)
    sdiRate: 0.013, // 1.3%

    // UI/ETT Wage Base - 2026
    suiLimit: 7000,
    ettLimit: 7000,

    // FUTA Credit Reduction - CA specific
    // Projected 1.5% (not finalized until after Nov 10, 2026)
    futaCreditReductionRate: 0.015, // 1.5%
  },
}
