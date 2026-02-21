import { format, formatDistanceToNowStrict, isValid } from "date-fns"

type DateOnly = string // MM/DD/YYYY format

interface PayrollDateParams {
  start: Date
  end: Date
  payDate: Date
}

/**
 * Formats user input as a date string with automatic slash insertion
 * Keeps only digits (max 8), then inserts slashes at appropriate positions
 *
 * @param value - Raw input string from user (may contain non-digit characters)
 * @returns Formatted date string in MM/DD/YYYY format (partial or complete)
 *
 * @example
 * formatDateInput("1") // "1"
 * formatDateInput("12") // "12"
 * formatDateInput("123") // "12/3"
 * formatDateInput("1234") // "12/34"
 * formatDateInput("12345") // "12/34/5"
 * formatDateInput("12342024") // "12/34/2024"
 * formatDateInput("abc123xyz") // "12/3" (strips non-digits)
 * formatDateInput("123456789") // "12/34/5678" (max 8 digits)
 */
export const formatDateInput = (value : string) => {
  // Keep digits only, limit to 8 (MMDDYYYY), then insert slashes
  const digits = value.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/**
 * Convert Date object to DateOnly string
 * @param date - Date object (uses local timezone)
 * @returns MM/DD/YYYY date string
 *
 * @example
 * toDateOnly(new Date(2000, 0, 15)) // "01/15/2000"
 */
export function toDateOnly(date : Date) : DateOnly {
  if (!date || !isValid(date)) {
    throw new Error("Invalid date provided to toDateOnly")
  }
  return format(date, "MM/dd/yyyy")
}

/**
 * Formats a UTC date to a localized string (e.g., "January 15, 2024")
 * Use this for date-only fields (DOB, HireDate, Trial dates) to avoid timezone shifts
 *
 * @param date - Date to format (Date object or ISO string stored as UTC midnight)
 * @returns Formatted date string or null if date is undefined
 *
 * @example
 * // Date stored as UTC midnight: 2024-01-15T00:00:00.000Z
 * formatDateUTC("2024-01-15T00:00:00.000Z") // "January 15, 2024" (always, regardless of timezone)
 * formatDateUTC(new Date("2024-01-15T00:00:00.000Z")) // "January 15, 2024"
 */
export function formatDateUTC(date ?: Date | string) : string | null {
  if (!date) return null
  const dateObj = typeof date === "string" ? new Date(date) : date
  if (!isValid(dateObj)) return null

  // Use UTC methods to avoid timezone conversion
  const year = dateObj.getUTCFullYear()
  const month = dateObj.getUTCMonth() // 0-indexed
  const day = dateObj.getUTCDate()

  // Create date string using UTC components
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  return `${months[month]} ${day}, ${year}`
}

/**
 * Formats a date as relative time from now (e.g., "3 days", "5 days ago")
 *
 * @param date - Date to format (Date object or ISO string)
 * @param options - Formatting options
 * @param options.addSuffix - Whether to add "ago" suffix for past dates (default: false)
 * @param options.unit - The unit to use for formatting (default: "day")
 * @returns Formatted relative time string
 *
 * @example
 * formatDistanceToNow(new Date()) // "0 days"
 * formatDistanceToNow(pastDate, { addSuffix: true }) // "5 days ago"
 * formatDistanceToNow(futureDate) // "3 days"
 */
export function formatDistanceToNow(
  date : Date | string,
  options ?: {
    addSuffix ?: boolean
    unit ?: "second" | "minute" | "hour" | "day" | "month" | "year"
  }
) : string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return formatDistanceToNowStrict(dateObj, {
    unit: options?.unit ?? "day",
    addSuffix: options?.addSuffix ?? false,
  })
}

/**
 * Converts MM/DD/YYYY string to UTC midnight Date
 * Use this for date-only fields (DOB, HireDate, EffectiveDate) to ensure consistency across timezones
 *
 * @param dateString - Date string in MM/DD/YYYY format
 * @returns Date object set to UTC midnight, or null if invalid
 *
 * @example
 * // For payroll date fields (DOB, HireDate, etc.)
 * parseToUTCMidnight("01/15/2024") // 2024-01-15T00:00:00.000Z (always UTC midnight)
 *
 * // Why this matters for payroll:
 * // User in PST enters "01/15/2024"
 * // Without UTC normalization: 2024-01-15T08:00:00.000Z (PST → UTC)
 * // With UTC normalization:    2024-01-15T00:00:00.000Z (consistent)
 * // Reading in any timezone:   Always displays as "01/15/2024"
 */
export function parseToUTCMidnight(dateString : string) : Date | null {
  if (!dateString) return null

  // Parse MM/DD/YYYY format
  const parts = dateString.split("/")
  if (parts.length !== 3) return null

  const month = parseInt(parts[0], 10)
  const day = parseInt(parts[1], 10)
  const year = parseInt(parts[2], 10)

  if (isNaN(month) || isNaN(day) || isNaN(year)) return null
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  if (year < 1900 || year > 2100) return null

  // Create Date in UTC (month is 0-indexed)
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))

  if (!isValid(date)) return null
  return date
}

/**
 * Extracts date-only string from Date object (ignores time and timezone)
 * Use this when displaying date-only fields to users
 *
 * @param date - Date object or ISO string from MongoDB
 * @returns Date string in MM/DD/YYYY format
 *
 * @example
 * // Date from MongoDB (stored as UTC midnight)
 * const dbDate = new Date("2024-01-15T00:00:00.000Z")
 * extractDateOnly(dbDate) // "01/15/2024" (regardless of user timezone)
 */
export function extractDateOnly(date : Date | string | null | undefined) : string | null {
  if (!date) return null
  const dateObj = typeof date === "string" ? new Date(date) : date
  if (!isValid(dateObj)) return null

  // Extract UTC date components to avoid timezone shifts
  const year = dateObj.getUTCFullYear()
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0")
  const day = String(dateObj.getUTCDate()).padStart(2, "0")

  return `${month}/${day}/${year}`
}

/**
 * Get year date range (January 1 to December 31) in UTC
 * @param year - The year
 * @returns Start and end dates for the year
 *
 * @example
 * getYearDateRange(2026)
 * // { start: 2026-01-01T00:00:00.000Z, end: 2026-12-31T23:59:59.999Z }
 */
export function getYearDateRange(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
  }
}

// ============================================================================
// URL Parameter Date Utilities (MM-DD-YYYY format)
// ============================================================================

/**
 * Format Date as MM-DD-YYYY string using local time (no timezone offset)
 * Use this for URL search params - matches DB format
 *
 * @param date - Date object
 * @returns Date string in MM-DD-YYYY format
 *
 * @example
 * formatDateParam(new Date(2026, 0, 15)) // "01-15-2026"
 */
export function formatDateParam(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${month}-${day}-${year}`
}

/**
 * Parse MM-DD-YYYY string as local date (not UTC)
 * Returns null if invalid format or invalid date
 *
 * @param dateString - Date string in MM-DD-YYYY format
 * @returns Date object or null if invalid
 *
 * @example
 * parseDateParam("01-15-2026") // Date(2026, 0, 15)
 * parseDateParam("invalid") // null
 * parseDateParam("13-01-2026") // null (invalid month)
 * parseDateParam("01-32-2026") // null (invalid day)
 * parseDateParam("02-30-2026") // null (Feb 30 doesn't exist)
 */
export function parseDateParam(dateString: string | null | undefined): Date | null {
  if (!dateString) return null

  // Must match MM-DD-YYYY format
  if (!/^\d{2}-\d{2}-\d{4}$/.test(dateString)) return null

  const [monthStr, dayStr, yearStr] = dateString.split("-")
  const month = parseInt(monthStr, 10)
  const day = parseInt(dayStr, 10)
  const year = parseInt(yearStr, 10)

  // Validate ranges
  if (isNaN(month) || isNaN(day) || isNaN(year)) return null
  if (year < 1900 || year > 2100) return null
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null

  // Create date and verify it's valid (handles invalid dates like Feb 30)
  const date = new Date(year, month - 1, day)

  // Check if date is valid and matches input (catches invalid dates like 01-32-2026)
  if (
    !isValid(date) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

/**
 * Calculate the current pay period based on today's date and pay schedule
 * Used to set default URL params when they're missing
 *
 * @param paySchedule - "biweekly" or "monthly" from company settings
 * @returns PayrollDateParams for the current period
 *
 * @example
 * // If today is Jan 15, 2026 and paySchedule is "monthly"
 * getCurrentPayPeriod("monthly")
 * // Returns: { start: Jan 1, end: Jan 31, payDate: Jan 31 }
 *
 * // If today is Jan 15, 2026 and paySchedule is "biweekly"
 * // (assuming biweekly periods start Jan 1)
 * getCurrentPayPeriod("biweekly")
 * // Returns: { start: Jan 1, end: Jan 14, payDate: Jan 14 }
 */
export function getCurrentPayPeriod(
  paySchedule: "biweekly" | "monthly"
): PayrollDateParams {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (paySchedule === "monthly") {
    // Monthly: first day to last day of current month
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0) // Last day of month
    return {
      start,
      end,
      payDate: end,
    }
  } else {
    // Biweekly: 14-day periods starting from Jan 1 of current year
    const yearStart = new Date(today.getFullYear(), 0, 1)
    const daysSinceYearStart = Math.floor(
      (today.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)
    )
    const periodIndex = Math.floor(daysSinceYearStart / 14)

    const start = new Date(yearStart)
    start.setDate(start.getDate() + periodIndex * 14)

    const end = new Date(start)
    end.setDate(end.getDate() + 13) // 14 days total (0-13)

    return {
      start,
      end,
      payDate: end,
    }
  }
}

/**
 * Parse and validate payroll date parameters from URL searchParams
 * Returns today's date defaults if any param is invalid
 *
 * Note: periodType is NOT parsed from URL - it must come from company collection
 * (URL params are untrusted user input, periodType should come from DB)
 *
 * Validation rules:
 * - All dates must be valid MM-DD-YYYY format
 * - Invalid dates like "01-32-2026" return today's date
 * - start must be before or equal to end
 * - payDate must be on or after start date
 *
 * @param params - URL search params object (start, end, payDate only)
 * @returns Validated PayrollDateParams with fallback to today
 *
 * @example
 * // Valid params
 * parsePayrollDateParams({ start: "01-01-2026", end: "01-15-2026", payDate: "01-15-2026" })
 * // Returns: { start: Date, end: Date, payDate: Date }
 *
 * // Invalid payDate (01-32-2026 is not valid)
 * parsePayrollDateParams({ start: "01-01-2026", end: "01-15-2026", payDate: "01-32-2026" })
 * // Returns: defaults to today's date for all fields
 */
export function parsePayrollDateParams(params: {
  start?: string | null
  end?: string | null
  payDate?: string | null
}): PayrollDateParams {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Parse all dates
  const startDate = parseDateParam(params.start)
  const endDate = parseDateParam(params.end)
  const payDateParsed = parseDateParam(params.payDate)

  // If any required date is invalid, return today's defaults
  if (!startDate || !endDate || !payDateParsed) {
    return {
      start: today,
      end: today,
      payDate: today,
    }
  }

  // Validate date relationships
  // start must be before or equal to end
  if (startDate > endDate) {
    return {
      start: today,
      end: today,
      payDate: today,
    }
  }

  // payDate must be on or after start
  if (payDateParsed < startDate) {
    return {
      start: today,
      end: today,
      payDate: today,
    }
  }

  return {
    start: startDate,
    end: endDate,
    payDate: payDateParsed,
  }
}
