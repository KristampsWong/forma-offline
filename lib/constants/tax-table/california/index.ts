import type { TaxYear } from "@/lib/constants/tax-rates"
import { californiaTaxTables2025 } from "./2025"
import { californiaTaxTables2026 } from "./2026"
import type { CaliforniaTaxTables } from "./types"

export type {
  CaliforniaTaxBracket,
  CaliforniaTaxTables,
  EstimatedDeduction,
  ExemptionAllowance,
  LowIncomeExemption,
  StandardDeduction,
} from "./types"
export { getNumberOfPayPeriods } from "./types"

/**
 * Registry of California tax tables by year
 */
const californiaTaxTablesByYear: Record<number, CaliforniaTaxTables> = {
  2025: californiaTaxTables2025,
  2026: californiaTaxTables2026,
}

/**
 * Get California tax tables for a specific year
 * @param year - Tax year (e.g., 2025)
 * @throws Error if tables not available for the specified year
 */
export function getCaliforniaTaxTables(
  year: TaxYear | number,
): CaliforniaTaxTables {
  const tables = californiaTaxTablesByYear[year]
  if (!tables) {
    const availableYears = Object.keys(californiaTaxTablesByYear).join(", ")
    throw new Error(
      `California tax tables not available for year ${year}. Available years: ${availableYears}`,
    )
  }
  return tables
}

/**
 * Check if California tax tables are available for a specific year
 */
export function hasCaliforniaTaxTablesForYear(year: number): boolean {
  return year in californiaTaxTablesByYear
}
