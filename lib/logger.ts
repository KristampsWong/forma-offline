/**
 * Unified logging utility
 * Uses environment-based logging configuration from lib/config/index.ts
 */

import { logging } from "@/lib/config"

/**
 * Log levels (in order of severity)
 */
type LogLevel = "debug" | "info" | "warn" | "error"

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/**
 * Check if a log should be output based on current log level
 */
function shouldLog(level: LogLevel): boolean {
  const currentLevel = logging.level as LogLevel
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

/**
 * Logger with environment-aware log levels
 *
 * Usage:
 * - Development: All logs (debug, info, warn, error) are shown
 * - Production: Only errors are shown
 * - Test: Only errors are shown (same as production)
 */
export const logger = {
  /**
   * Debug logs (only in development)
   * Use for detailed debugging information
   */
  debug: (message: string, ...args: unknown[]) => {
    if (shouldLog("debug")) {
      console.log(`[DEBUG] ${message}`, ...args)
    }
  },

  /**
   * Info logs (development only by default)
   * Use for general information
   */
  info: (message: string, ...args: unknown[]) => {
    if (shouldLog("info")) {
      console.log(`[INFO] ${message}`, ...args)
    }
  },

  /**
   * Warning logs (shown in all environments if level allows)
   * Use for potential issues
   */
  warn: (message: string, ...args: unknown[]) => {
    if (shouldLog("warn")) {
      console.warn(`[WARN] ${message}`, ...args)
    }
  },

  /**
   * Error logs (always shown in all environments)
   * Use for actual errors that need attention
   */
  error: (message: string, ...args: unknown[]) => {
    if (shouldLog("error")) {
      console.error(`[ERROR] ${message}`, ...args)
    }
  },

  /**
   * Request logs (only when enabled in config)
   * Use for HTTP request/response logging
   */
  request: (method: string, path: string, details?: Record<string, unknown>) => {
    if (logging.logRequests) {
      console.log(`[REQUEST] ${method} ${path}`, details || "")
    }
  },

  /**
   * Test mode logs (always shown in test mode)
   * Use for test-specific logging
   */
  test: (message: string, ...args: unknown[]) => {
    console.log(`[TEST MODE] ${message}`, ...args)
  },
}

/**
 * Type-safe logger for specific modules
 * Adds module prefix to all logs
 */
export function createModuleLogger(moduleName: string) {
  return {
    debug: (message: string, ...args: unknown[]) =>
      logger.debug(`[${moduleName}] ${message}`, ...args),
    info: (message: string, ...args: unknown[]) =>
      logger.info(`[${moduleName}] ${message}`, ...args),
    warn: (message: string, ...args: unknown[]) =>
      logger.warn(`[${moduleName}] ${message}`, ...args),
    error: (message: string, ...args: unknown[]) =>
      logger.error(`[${moduleName}] ${message}`, ...args),
  }
}
