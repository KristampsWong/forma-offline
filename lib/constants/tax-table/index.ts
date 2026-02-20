/**
 * Tax Tables - Year-based organization
 *
 * Usage:
 *   import { getFederalTaxTables, getCaliforniaTaxTables } from "@/lib/constants/tax-table"
 *
 *   const federalTables = getFederalTaxTables(2025)
 *   const californiaTables = getCaliforniaTaxTables(2025)
 */

export type {
  CaliforniaTaxBracket,
  CaliforniaTaxTables,
  EstimatedDeduction,
  ExemptionAllowance,
  LowIncomeExemption,
  StandardDeduction,
} from "./california"
// California tax tables
export {
  getCaliforniaTaxTables,
  getNumberOfPayPeriods,
  hasCaliforniaTaxTablesForYear,
} from "./california"
export type { FederalTaxBracket, FederalTaxTables } from "./federal"
// Federal tax tables
export {
  getFederalTaxTables,
  hasFederalTaxTablesForYear,
} from "./federal"
