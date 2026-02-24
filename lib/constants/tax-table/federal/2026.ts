import type { FederalTaxTables } from "./types"

/**
 * 2026 Federal Percentage Method Tables
 * Source: IRS Publication 15-T (2026)
 */
export const federalTaxTables2026: FederalTaxTables = {
  year: 2026,

  /**
   * Single or Married Filing Separately - STANDARD
   * (Use when Form W-4 Step 2 checkbox is NOT checked)
   */
  single: [
    { min: 0, max: 7500, tentativeAmount: 0, rate: 0 },
    { min: 7500, max: 19900, tentativeAmount: 0, rate: 0.1 },
    { min: 19900, max: 57900, tentativeAmount: 1240.0, rate: 0.12 },
    { min: 57900, max: 113200, tentativeAmount: 5800.0, rate: 0.22 },
    { min: 113200, max: 209275, tentativeAmount: 17966.0, rate: 0.24 },
    { min: 209275, max: 263725, tentativeAmount: 41024.0, rate: 0.32 },
    { min: 263725, max: 648100, tentativeAmount: 58448.0, rate: 0.35 },
    { min: 648100, max: Infinity, tentativeAmount: 192979.25, rate: 0.37 },
  ],

  /**
   * Single or Married Filing Separately - Step 2 Checked
   * (Use when Form W-4 Step 2 checkbox IS checked)
   */
  singleStep2Checked: [
    { min: 0, max: 8050, tentativeAmount: 0, rate: 0 },
    { min: 8050, max: 14250, tentativeAmount: 0, rate: 0.1 },
    { min: 14250, max: 33250, tentativeAmount: 620.0, rate: 0.12 },
    { min: 33250, max: 60900, tentativeAmount: 2900.0, rate: 0.22 },
    { min: 60900, max: 108938, tentativeAmount: 8983.0, rate: 0.24 },
    { min: 108938, max: 136163, tentativeAmount: 20512.0, rate: 0.32 },
    { min: 136163, max: 328350, tentativeAmount: 29224.0, rate: 0.35 },
    { min: 328350, max: Infinity, tentativeAmount: 96489.63, rate: 0.37 },
  ],

  /**
   * Married Filing Jointly - STANDARD
   * (Use when Form W-4 Step 2 checkbox is NOT checked)
   */
  marriedJointly: [
    { min: 0, max: 19300, tentativeAmount: 0, rate: 0 },
    { min: 19300, max: 44100, tentativeAmount: 0, rate: 0.1 },
    { min: 44100, max: 120100, tentativeAmount: 2480.0, rate: 0.12 },
    { min: 120100, max: 230700, tentativeAmount: 11600.0, rate: 0.22 },
    { min: 230700, max: 422850, tentativeAmount: 35932.0, rate: 0.24 },
    { min: 422850, max: 531750, tentativeAmount: 82048.0, rate: 0.32 },
    { min: 531750, max: 788000, tentativeAmount: 116896.0, rate: 0.35 },
    { min: 788000, max: Infinity, tentativeAmount: 206583.5, rate: 0.37 },
  ],

  /**
   * Married Filing Jointly - Step 2 Checked
   * (Use when Form W-4 Step 2 checkbox IS checked)
   */
  marriedJointlyStep2Checked: [
    { min: 0, max: 16100, tentativeAmount: 0, rate: 0 },
    { min: 16100, max: 28500, tentativeAmount: 0, rate: 0.1 },
    { min: 28500, max: 66500, tentativeAmount: 1240.0, rate: 0.12 },
    { min: 66500, max: 121800, tentativeAmount: 5800.0, rate: 0.22 },
    { min: 121800, max: 217875, tentativeAmount: 17966.0, rate: 0.24 },
    { min: 217875, max: 272325, tentativeAmount: 41024.0, rate: 0.32 },
    { min: 272325, max: 400450, tentativeAmount: 58448.0, rate: 0.35 },
    { min: 400450, max: Infinity, tentativeAmount: 103291.75, rate: 0.37 },
  ],

  /**
   * Head of Household - STANDARD
   * (Use when Form W-4 Step 2 checkbox is NOT checked)
   */
  headOfHousehold: [
    { min: 0, max: 15550, tentativeAmount: 0, rate: 0 },
    { min: 15550, max: 33250, tentativeAmount: 0, rate: 0.1 },
    { min: 33250, max: 83000, tentativeAmount: 1770.0, rate: 0.12 },
    { min: 83000, max: 121250, tentativeAmount: 7740.0, rate: 0.22 },
    { min: 121250, max: 217300, tentativeAmount: 16155.0, rate: 0.24 },
    { min: 217300, max: 271750, tentativeAmount: 39207.0, rate: 0.32 },
    { min: 271750, max: 656150, tentativeAmount: 56631.0, rate: 0.35 },
    { min: 656150, max: Infinity, tentativeAmount: 191171.0, rate: 0.37 },
  ],

  /**
   * Head of Household - Step 2 Checked
   * (Use when Form W-4 Step 2 checkbox IS checked)
   */
  headOfHouseholdStep2Checked: [
    { min: 0, max: 12075, tentativeAmount: 0, rate: 0 },
    { min: 12075, max: 20925, tentativeAmount: 0, rate: 0.1 },
    { min: 20925, max: 45800, tentativeAmount: 885.0, rate: 0.12 },
    { min: 45800, max: 64925, tentativeAmount: 3870.0, rate: 0.22 },
    { min: 64925, max: 112950, tentativeAmount: 8077.5, rate: 0.24 },
    { min: 112950, max: 140175, tentativeAmount: 19603.5, rate: 0.32 },
    { min: 140175, max: 332375, tentativeAmount: 28315.5, rate: 0.35 },
    { min: 332375, max: Infinity, tentativeAmount: 95585.5, rate: 0.37 },
  ],
}
