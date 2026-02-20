import type { FederalTaxTables } from "./types"

/**
 * 2025 Federal Percentage Method Tables
 * Source: IRS Publication 15-T (2025)
 */
export const federalTaxTables2025: FederalTaxTables = {
  year: 2025,

  /**
   * Single or Married Filing Separately - STANDARD
   * (Use when Form W-4 Step 2 checkbox is NOT checked)
   */
  single: [
    { min: 0, max: 6400, tentativeAmount: 0, rate: 0 },
    { min: 6400, max: 18325, tentativeAmount: 0, rate: 0.1 },
    { min: 18325, max: 54875, tentativeAmount: 1192.5, rate: 0.12 },
    { min: 54875, max: 109750, tentativeAmount: 5578.5, rate: 0.22 },
    { min: 109750, max: 203700, tentativeAmount: 17651.0, rate: 0.24 },
    { min: 203700, max: 256925, tentativeAmount: 40199.0, rate: 0.32 },
    { min: 256925, max: 632750, tentativeAmount: 57231.0, rate: 0.35 },
    { min: 632750, max: Infinity, tentativeAmount: 188769.75, rate: 0.37 },
  ],

  /**
   * Single or Married Filing Separately - Step 2 Checked
   * (Use when Form W-4 Step 2 checkbox IS checked)
   */
  singleStep2Checked: [
    { min: 0, max: 7500, tentativeAmount: 0, rate: 0 },
    { min: 7500, max: 13463, tentativeAmount: 0, rate: 0.1 },
    { min: 13463, max: 31738, tentativeAmount: 596.25, rate: 0.12 },
    { min: 31738, max: 59175, tentativeAmount: 2789.25, rate: 0.22 },
    { min: 59175, max: 106150, tentativeAmount: 8825.5, rate: 0.24 },
    { min: 106150, max: 132763, tentativeAmount: 20099.5, rate: 0.32 },
    { min: 132763, max: 320675, tentativeAmount: 28615.5, rate: 0.35 },
    { min: 320675, max: Infinity, tentativeAmount: 94384.88, rate: 0.37 },
  ],

  /**
   * Married Filing Jointly - STANDARD
   * (Use when Form W-4 Step 2 checkbox is NOT checked)
   */
  marriedJointly: [
    { min: 0, max: 17100, tentativeAmount: 0, rate: 0 },
    { min: 17100, max: 40950, tentativeAmount: 0, rate: 0.1 },
    { min: 40950, max: 114050, tentativeAmount: 2385.0, rate: 0.12 },
    { min: 114050, max: 223800, tentativeAmount: 11157.0, rate: 0.22 },
    { min: 223800, max: 411700, tentativeAmount: 35302.0, rate: 0.24 },
    { min: 411700, max: 518150, tentativeAmount: 80398.0, rate: 0.32 },
    { min: 518150, max: 768700, tentativeAmount: 114462.0, rate: 0.35 },
    { min: 768700, max: Infinity, tentativeAmount: 202154.5, rate: 0.37 },
  ],

  /**
   * Married Filing Jointly - Step 2 Checked
   * (Use when Form W-4 Step 2 checkbox IS checked)
   */
  marriedJointlyStep2Checked: [
    { min: 0, max: 15000, tentativeAmount: 0, rate: 0 },
    { min: 15000, max: 26925, tentativeAmount: 0, rate: 0.1 },
    { min: 26925, max: 63475, tentativeAmount: 1192.5, rate: 0.12 },
    { min: 63475, max: 118350, tentativeAmount: 5578.5, rate: 0.22 },
    { min: 118350, max: 212300, tentativeAmount: 17651.0, rate: 0.24 },
    { min: 212300, max: 265525, tentativeAmount: 40199.0, rate: 0.32 },
    { min: 265525, max: 390800, tentativeAmount: 57231.0, rate: 0.35 },
    { min: 390800, max: Infinity, tentativeAmount: 101077.25, rate: 0.37 },
  ],

  /**
   * Head of Household - STANDARD
   * (Use when Form W-4 Step 2 checkbox is NOT checked)
   */
  headOfHousehold: [
    { min: 0, max: 13900, tentativeAmount: 0, rate: 0 },
    { min: 13900, max: 30900, tentativeAmount: 0, rate: 0.1 },
    { min: 30900, max: 78750, tentativeAmount: 1700.0, rate: 0.12 },
    { min: 78750, max: 117250, tentativeAmount: 7442.0, rate: 0.22 },
    { min: 117250, max: 211200, tentativeAmount: 15912.0, rate: 0.24 },
    { min: 211200, max: 264400, tentativeAmount: 38460.0, rate: 0.32 },
    { min: 264400, max: 640250, tentativeAmount: 55484.0, rate: 0.35 },
    { min: 640250, max: Infinity, tentativeAmount: 187031.5, rate: 0.37 },
  ],

  /**
   * Head of Household - Step 2 Checked
   * (Use when Form W-4 Step 2 checkbox IS checked)
   */
  headOfHouseholdStep2Checked: [
    { min: 0, max: 11250, tentativeAmount: 0, rate: 0 },
    { min: 11250, max: 19750, tentativeAmount: 0, rate: 0.1 },
    { min: 19750, max: 43675, tentativeAmount: 850.0, rate: 0.12 },
    { min: 43675, max: 62925, tentativeAmount: 3721.0, rate: 0.22 },
    { min: 62925, max: 109900, tentativeAmount: 7956.0, rate: 0.24 },
    { min: 109900, max: 136500, tentativeAmount: 19230.0, rate: 0.32 },
    { min: 136500, max: 324425, tentativeAmount: 27742.0, rate: 0.35 },
    { min: 324425, max: Infinity, tentativeAmount: 93515.75, rate: 0.37 },
  ],
}
