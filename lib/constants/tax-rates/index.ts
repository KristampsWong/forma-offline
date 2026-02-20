import { taxRates2025 } from "./2025"
import type { TaxRates, TaxYear } from "./types"

export type {
  CaliforniaTaxRates,
  FederalTaxRates,
  TaxRates,
  TaxYear,
} from "./types"

/**
 * Registry of tax rates by year
 * Add new years here as they become available
 */
const taxRatesByYear: Record<TaxYear, TaxRates> = {
  2025: taxRates2025,
  2026: taxRates2025, // Placeholder: use 2025 rates until 2026 rates are published
}

/**
 * Get tax rates for a specific tax year
 * @param year - The tax year (e.g., 2025)
 * @throws Error if tax rates are not available for the specified year
 */
export function getTaxRatesByYear(year: TaxYear): TaxRates {
  const rates = taxRatesByYear[year]
  if (!rates) {
    throw new Error(
      `Tax rates not available for year ${year}. Available years: ${Object.keys(taxRatesByYear).join(", ")}`,
    )
  }
  return rates
}

/**
 * Get tax rates based on a pay period start date
 * Uses the year from the pay period to determine which tax rates to apply
 *
 * @param payPeriodStartDate - ISO date string (YYYY-MM-DD) or Date object
 * @returns Tax rates for the corresponding year
 *
 * @example
 * // For a payroll starting Jan 15, 2025
 * const rates = getTaxRates("2025-01-15")
 * // Returns 2025 tax rates
 */
export function getTaxRates(payPeriodStartDate: string | Date): TaxRates {
  const date =
    typeof payPeriodStartDate === "string"
      ? new Date(payPeriodStartDate)
      : payPeriodStartDate

  const year = date.getUTCFullYear() as TaxYear

  // Validate year is supported
  if (!taxRatesByYear[year]) {
    // Fall back to most recent available year if future year requested
    const availableYears = Object.keys(taxRatesByYear)
      .map(Number)
      .sort((a, b) => b - a)
    const mostRecentYear = availableYears[0] as TaxYear

    if (year > mostRecentYear) {
      console.warn(
        `Tax rates for ${year} not yet available, using ${mostRecentYear} rates`,
      )
      return taxRatesByYear[mostRecentYear]
    }

    throw new Error(
      `Tax rates not available for year ${year}. Available years: ${availableYears.join(", ")}`,
    )
  }

  return taxRatesByYear[year]
}

/**
 * Check if tax rates are available for a specific year
 */
export function hasTaxRatesForYear(year: number): boolean {
  return year in taxRatesByYear
}

/**
 * Get all available tax years
 */
export function getAvailableTaxYears(): TaxYear[] {
  return Object.keys(taxRatesByYear).map(Number) as TaxYear[]
}
