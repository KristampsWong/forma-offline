/**
 * Centralized error message constants
 * 
 * Benefits:
 * - Consistency across the application
 * - Easy to update error messages
 * - Easier to implement i18n in the future
 * - Better searchability and maintainability
 */

/**
 * Authentication & Authorization Errors
 */
export const AUTH_ERRORS = {
  UNAUTHORIZED: "Unauthorized - Please sign in",
  ONLY_OWNER: "Unauthorized: Only the company owner can perform this action",
} as const

/**
 * Subscription & Trial Errors
 */
export const SUBSCRIPTION_ERRORS = {
  TRIAL_EXPIRED: "Your 10-day trial has expired. Please subscribe to continue.",
  TRIAL_EXPIRED_CREATE: "Trial expired. Please subscribe to create more companies.",
  NO_SUBSCRIPTION: "Subscription not found",
  SUBSCRIPTION_CANCELED: "Subscription canceled.",
  ACCESS_DENIED: "Access denied. Please check your subscription status.",
  TRIAL_END_NOT_FOUND: "Trial end date not found",
  COMPANY_LIMIT_REACHED: "You have reached your company limit. Please upgrade your plan.",
} as const

/**
 * Company Errors
 */
export const COMPANY_ERRORS = {
  NOT_FOUND: "Company not found",
  ALREADY_EXISTS: "Company already exists for this user",
  FAILED_TO_CREATE: "Failed to create company",
  FAILED_TO_UPDATE: "Failed to update company",
  FAILED_TO_UPDATE_RATES: "Failed to update company state rates",
  FAILED_SUBSCRIPTION_INIT: "Failed to initialize subscription. Please try again.",
  RACE_CONDITION: "Company creation failed due to limit enforcement. Please try again.",
} as const

/**
 * Employee Errors
 */
export const EMPLOYEE_ERRORS = {
  NOT_FOUND: "Employee not found",
  EMAIL_EXISTS: "An employee with this email already exists",
  SSN_EXISTS: "An employee with this SSN already exists",
  EMAIL_OR_SSN_EXISTS: "An employee with this email or SSN already exists",
  INVALID_DOB_FORMAT: (value: string) => `Invalid date format for date of birth: ${value}`,
  INVALID_HIRE_DATE_FORMAT: (value: string) => `Invalid date format for hire date: ${value}`,
  INVALID_TERMINATION_DATE_FORMAT: (value: string) => `Invalid date format for termination date: ${value}`,
  FAILED_TO_UPDATE: "Failed to update employee",
} as const

/**
 * State Rate Errors
 */
export const STATE_RATE_ERRORS = {
  FUTURE_DATE: "Effective date cannot be in the future. Please set a date that is today or earlier.",
  EFFECTIVE_DATE_BEFORE_CURRENT: "Effective date cannot be before the current rate's effective date. Update the existing rate instead.",
} as const

/**
 * Payroll Errors
 */
export const PAYROLL_ERRORS = {
  NOT_FOUND: "Payroll record not found",
  ACCESS_DENIED: "Access denied to this payroll record",
  CANNOT_MODIFY_APPROVED: "Cannot modify an approved payroll record",
  OVERLAPPING_PERIOD: "Pay period overlaps with an existing record",
  MISSING_STATE_RATES: "Company is missing state tax rates",
  INVALID_DATE_FORMAT: "Invalid date format. Expected MM-DD-YYYY",
  PAY_DATE_BEFORE_START: "Pay date cannot be before period start date",
  TAX_CALCULATION_MISMATCH: "Tax calculation mismatch. Please refresh the page and try again",
} as const

/**
 * Generic Errors
 */
export const GENERIC_ERRORS = {
  UNKNOWN: "An unknown error occurred",
  DATABASE_ERROR: "Database connection failed",
  VALIDATION_ERROR: "Validation error",
} as const

/**
 * Combined export for convenience
 */
export const ERRORS = {
  AUTH: AUTH_ERRORS,
  SUBSCRIPTION: SUBSCRIPTION_ERRORS,
  COMPANY: COMPANY_ERRORS,
  EMPLOYEE: EMPLOYEE_ERRORS,
  PAYROLL: PAYROLL_ERRORS,
  STATE_RATE: STATE_RATE_ERRORS,
  GENERIC: GENERIC_ERRORS,
} as const
