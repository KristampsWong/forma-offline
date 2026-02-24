import type { TaxYear } from "@/lib/constants/tax-rates"
import { federalTaxTables2025 } from "./2025"
import { federalTaxTables2026 } from "./2026"
import type { FederalTaxTables } from "./types"

export type { FederalTaxBracket, FederalTaxTables } from "./types"

/**
 * Registry of federal tax tables by year
 */
const federalTaxTablesByYear: Record<number, FederalTaxTables> = {
  2025: federalTaxTables2025,
  2026: federalTaxTables2026,
}

/**
 * Get federal tax tables for a specific year
 * @param year - Tax year (e.g., 2025)
 * @throws Error if tables not available for the specified year
 */
export function getFederalTaxTables(year: TaxYear | number): FederalTaxTables {
  const tables = federalTaxTablesByYear[year]
  if (!tables) {
    const availableYears = Object.keys(federalTaxTablesByYear).join(", ")
    throw new Error(
      `Federal tax tables not available for year ${year}. Available years: ${availableYears}`,
    )
  }
  return tables
}

/**
 * Check if federal tax tables are available for a specific year
 */
export function hasFederalTaxTablesForYear(year: number): boolean {
  return year in federalTaxTablesByYear
}
