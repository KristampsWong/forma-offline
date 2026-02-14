/**
 * Application configuration based on environment
 * This file provides environment-specific configuration values
 */

import { isDevelopment, isProduction, isTestMode } from "@/lib/env"

/**
 * Feature flags
 * Control application behavior based on environment
 */
export const features = {
  /** Skip email sending in test mode */
  skipEmailInTest: isTestMode(),

  /** Skip rate limiting in test mode */
  skipRateLimitInTest: isTestMode(),

  /** Skip database operations during build */
  skipDatabaseInBuild: false, // Set to true if needed

  /** Enable debug logging in development */
  enableDebugLogs: isDevelopment(),
} as const

/**
 * Create environment-based defaults
 * Only specify the differences between dev and prod
 *
 * @param baseDefaults - Production defaults (empty values)
 * @param devOverrides - Development overrides (pre-filled values)
 * @returns Merged defaults based on environment
 */
function createDefaults<T extends Record<string, unknown>>(
  baseDefaults: T,
  devOverrides: Partial<T> = {}
): T {
  // Test mode should use empty values (like production) for proper validation testing
  if (isDevelopment() && !isTestMode()) {
    return { ...baseDefaults, ...devOverrides } as T
  }
  return baseDefaults
}

/**
 * Default form values
 * Development: Pre-filled with dummy data for faster testing
 * Production: Empty values for real user input
 */
export const defaults = {
  company: createDefaults(
    // Production defaults (empty values)
    {
      name: "",
      ein: "",
      address: "",
      line2: "",
      city: "",
      state: "CA", // California-only for now
      zip: "",
      payFrequency: "monthly" as const,
    },
    // Development overrides (pre-filled values)
    {
      name: "Acme",
      ein: "12-3456789",
      address: "123 Main St",
      city: "San Francisco",
      zip: "94105",
    }
  ),

  employee: createDefaults(
    // Production defaults (empty values)
    {
      firstName: "",
      middleName: "",
      lastName: "",
      ssn: "",
      dateOfBirth: "",
      email: "",
      phoneNumber: "",
      street1: "",
      street2: "",
      city: "",
      state: "CA" as const, // California-only for now
      zipCode: "",
      hireDate: "",
      workingHours: "",
      employmentType: "W2" as const,
      payType: "hourly" as const,
      currentSalary: "",
      payMethod: "check" as const,
    },
    // Development overrides (pre-filled values)
    {
      firstName: "John",
      lastName: "Done",
      ssn: "123-45-6789",
      dateOfBirth: "01/01/1990",
      email: "ex@example.com",
      street1: "123 Main St",
      city: "San Francisco",
      zipCode: "94105",
      hireDate: "01/01/2024",
      currentSalary: "16.5",
    }
  ),

  // Update personal details form (for editing existing employee)
  employeePersonal: createDefaults(
    // Production defaults (empty values - will be populated from employee data)
    {
      firstName: "",
      lastName: "",
      middleName: "",
      email: "",
      phoneNumber: "",
      dateOfBirth: "",
      street1: "",
      street2: "",
      city: "",
      state: "CA" as const, // California-only for tax purposes
      zipCode: "",
    },
    // Development overrides (not used - form is populated from employee data)
    {}
  ),

  w4: createDefaults(
    // Production defaults (pre-selected for better UX)
    {
      formVersion: "w4_2020_or_later" as const,
      federalFilingStatus: "single_or_married_separately" as const,
      multipleJobsOrSpouseWorks: false,
      claimedDependentsDeduction: "",
      otherIncome: "",
      deductions: "",
      extraWithholding: "",
      stateFilingStatus: "single_or_married(with_two_or_more_incomes)" as const,
      regularAllowances: "",
      estimatedAllowances: "",
      stateAdditionalWithholding: "",
      californiaWagesPlanCode: "S" as const,
      futa: false,
      fica: false,
      suiEtt: false,
      sdi: false,
    },
    // Development overrides (additional pre-filled values for faster testing)
    {
      regularAllowances: "1",
    }
  ),
} as const

/**
 * Security settings
 * Production: Secure cookies, strict origin validation
 * Development: Relaxed for local testing
 */
export const security = {
  /** Use secure cookies (HTTPS only) in production */
  secureCookies: isProduction(),

  /** Strict origin validation in production */
  strictOriginValidation: isProduction(),
} as const

/**
 * Logging configuration
 * Development: Verbose logging
 * Production: Error logging only
 */
export const logging = {
  /** Log level based on environment */
  level: isDevelopment() ? "debug" : "error",

  /** Enable request logging in development */
  logRequests: isDevelopment(),
} as const
