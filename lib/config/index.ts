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
