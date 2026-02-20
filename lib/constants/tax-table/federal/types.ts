/**
 * Federal tax table type definitions
 */

/**
 * Tax bracket for federal percentage method tables
 */
export interface FederalTaxBracket {
  min: number
  max: number
  tentativeAmount: number
  rate: number
}

/**
 * Complete set of federal tax tables for a specific year
 * Includes both standard and Step 2 checked tables for all filing statuses
 */
export interface FederalTaxTables {
  year: number

  // Standard tables (Step 2 NOT checked)
  single: FederalTaxBracket[]
  marriedJointly: FederalTaxBracket[]
  headOfHousehold: FederalTaxBracket[]

  // Step 2 checked tables
  singleStep2Checked: FederalTaxBracket[]
  marriedJointlyStep2Checked: FederalTaxBracket[]
  headOfHouseholdStep2Checked: FederalTaxBracket[]
}
