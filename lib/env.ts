/**
 * Unified environment detection utilities
 * Central source of truth for environment checks across the application
 */

/**
 * Environment flags
 * These are computed once at module load time
 */
export const ENV = {
  /** Development mode (pnpm dev) */
  isDev: process.env.NODE_ENV === "development",

  /** Test mode (Vitest or Playwright) */
  isTest:
    process.env.NODE_ENV === "test" ||
    process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST === "true",

  /** Production mode (deployed app) */
  isProd: process.env.NODE_ENV === "production",

  /** Build time (pnpm build) */
  isBuild: process.env.NEXT_PHASE === "phase-production-build",
} as const

/**
 * Helper functions for environment checks
 * Use these instead of directly checking process.env.NODE_ENV
 */

/**
 * Check if running in test mode (Vitest or Playwright)
 * Used to skip operations during tests (email sending, rate limiting, etc.)
 */
export const isTestMode = (): boolean => ENV.isTest

/**
 * Check if running in development mode (pnpm dev)
 * Used for dev-only features (default form values, debug logs, etc.)
 */
export const isDevelopment = (): boolean => ENV.isDev

/**
 * Check if running in production mode (deployed app)
 * Used for production-only features (secure cookies, analytics, etc.)
 */
export const isProduction = (): boolean => ENV.isProd

/**
 * Check if running during build time (pnpm build)
 * Used to skip database operations during build
 */
export const isBuildTime = (): boolean => ENV.isBuild
