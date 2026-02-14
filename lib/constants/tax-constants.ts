/**
 * Tax Constants
 * Single source of truth for tax-related dropdown options
 */

export const W4_FORM_VERSIONS = [
  { value: "w4_2020_or_later", label: "2020 or later (Form W-4)" },
  { value: "w4_2019_or_earlier", label: "2019 or earlier (Form W-4)" },
] as const

// Federal filing statuses
export const FEDERAL_FILING_STATUSES = [
  {
    value: "single_or_married_separately",
    label: "Single or Married filing separately",
  },
  {
    value: "married_jointly_or_qualifying_surviving",
    label: "Married filing jointly or Qualifying surviving spouse",
  },
  { value: "head_of_household", label: "Head of household" },
  { value: "exempt", label: "Exempt" },
] as const

// State filing statuses (California)
export const STATE_FILING_STATUSES = [
  {
    value: "single_or_married(with_two_or_more_incomes)",
    label: "Single or Married (with two or more incomes)",
  },
  { value: "married(one_income)", label: "Married (one income)" },
  { value: "head_of_household", label: "Head of household" },
  { value: "do_not_withhold", label: "Do not withhold (exempt)" },
] as const

// Wage plan options (for CA)
export const WAGE_PLAN_OPTIONS = [
  { value: "A", label: "Plan Code A" },
  { value: "S", label: "Plan Code S" },
  { value: "J", label: "Plan Code J" },
  { value: "P", label: "Plan Code P" },
] as const

// Tax exemptions (for CA)
export const TAX_EXEMPTIONS = [
  { value: "futa", label: "FUTA" },
  { value: "fica", label: "Social Security and Medicare" },
  { value: "sui_ett", label: "CA SUI and ETT" },
  { value: "sdi", label: "CA SDI" },
] as const

// Supported states
export const SUPPORTED_STATES = [{ value: "CA", label: "California" }] as const

// Type exports
export type W4FormVersion = (typeof W4_FORM_VERSIONS)[number]["value"]
export type FederalFilingStatus =
  (typeof FEDERAL_FILING_STATUSES)[number]["value"]
export type StateFilingStatus = (typeof STATE_FILING_STATUSES)[number]["value"]
export type WagePlanCode = (typeof WAGE_PLAN_OPTIONS)[number]["value"]
export type TaxExemption = (typeof TAX_EXEMPTIONS)[number]["value"]
export type SupportedState = (typeof SUPPORTED_STATES)[number]["value"]
