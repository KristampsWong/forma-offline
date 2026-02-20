/**
 * Employment Constants
 * Single source of truth for employment-related dropdown options and configuration
 */

// Employment types
export const EMPLOYMENT_TYPES = [
  { value: "W2", label: "W-2 Employee" },
  // { value: "1099", label: "1099 Contractor" },
] as const

// Employment statuses
export const EMPLOYMENT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "terminated", label: "Terminated" },
] as const

// Pay types
export const PAY_TYPES = [
  { value: "yearly", label: "Yearly" },
  { value: "hourly", label: "Hourly" },
] as const

// Pay frequencies (Payroll Schedule)
export const PAY_FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
] as const

// Pay methods
export const PAY_METHODS = [
  { value: "check", label: "Check" },
  { value: "cash", label: "Cash" },
] as const

// Type exports
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]["value"]
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number]["value"]
export type PayType = (typeof PAY_TYPES)[number]["value"]
export type PayFrequency = (typeof PAY_FREQUENCIES)[number]["value"]
export type PayMethod = (typeof PAY_METHODS)[number]["value"]
