import type { Quarter, QuarterNumber } from "@/types/quarter"
import type { IDe9HeaderData } from "@/models/de9"

// ===== Quarter Utilities =====

/**
 * Get quarter (Q1-Q4) from date
 */
export function getQuarter(date: Date): Quarter {
  const month = date.getUTCMonth() + 1 // 0-11 -> 1-12
  if (month <= 3) return "Q1"
  if (month <= 6) return "Q2"
  if (month <= 9) return "Q3"
  return "Q4"
}

/**
 * Convert quarter string to number
 */
export function quarterToNumber(quarter: Quarter): QuarterNumber {
  return Number.parseInt(quarter.slice(1), 10) as QuarterNumber
}

/**
 * 获取季度的开始和结束日期 (UTC)
 * @param year - 年份
 * @param quarter - 季度 (1-4)
 * @returns 季度开始和结束日期
 */
export function getQuarterDates(
  year: number,
  quarter: QuarterNumber,
): { startDate: Date; endDate: Date } {
  const quarterStartMonth = (quarter - 1) * 3
  const quarterEndMonth = quarterStartMonth + 2

  // 使用 UTC 时间
  const startDate = new Date(Date.UTC(year, quarterStartMonth, 1, 0, 0, 0, 0))
  // 月末最后一天 23:59:59.999
  const endDate = new Date(
    Date.UTC(year, quarterEndMonth + 1, 0, 23, 59, 59, 999),
  )

  return { startDate, endDate }
}

/**
 * 根据日期计算所在季度的起止日期
 * @param date - 日期对象
 * @returns 季度开始和结束日期
 */
export function getQuarterDateRange(date: Date): { start: Date; end: Date } {
  const year = date.getUTCFullYear()
  const quarter = quarterToNumber(getQuarter(date))
  const { startDate, endDate } = getQuarterDates(year, quarter)
  return { start: startDate, end: endDate }
}

// ===== Tax Due Date Calculations =====

/**
 * 计算次月15日到期日期（通用）
 * 用于: Federal 941, CA PIT/SDI
 * @param periodEnd - 期间结束日期
 * @returns 次月15日 (UTC)
 */
export function calculate15thDueDate(periodEnd: Date): Date {
  const y = periodEnd.getUTCFullYear()
  const m = periodEnd.getUTCMonth()
  return new Date(Date.UTC(y, m + 1, 15, 23, 59, 59, 999))
}

/**
 * Calculate quarterly tax due date
 * Rule: Last day of the month following the quarter end
 * @param periodEnd - End date of the quarter
 * @returns Due date
 * @example
 * Q4 ends 12/31 -> due date is 1/31 (next month)
 * Q1 ends 3/31 -> due date is 4/30 (next month, last day)
 * Q2 ends 6/30 -> due date is 7/31 (next month, last day)
 * Q3 ends 9/30 -> due date is 10/31 (next month, last day)
 */
export function calculateQuarterlyDueDate(periodEnd: Date): Date {
  const y = periodEnd.getUTCFullYear()
  const m = periodEnd.getUTCMonth()
  // 下月最后一天 (day 0 of month+2 = last day of month+1)
  return new Date(Date.UTC(y, m + 2, 0, 23, 59, 59, 999))
}

/**
 * Calculate Form 940 annual due date (January 31 of following year)
 * If January 31 falls on a weekend, due date is next business day
 * @param year - The tax year
 * @returns Due date for Form 940
 */
export function calculateForm940DueDate(year: number): Date {
  const dueDate = new Date(Date.UTC(year + 1, 0, 31)) // January 31 of next year
  const dayOfWeek = dueDate.getUTCDay()

  // If Saturday (6), move to Monday (add 2 days)
  if (dayOfWeek === 6) {
    dueDate.setUTCDate(dueDate.getUTCDate() + 2)
  }
  // If Sunday (0), move to Monday (add 1 day)
  else if (dayOfWeek === 0) {
    dueDate.setUTCDate(dueDate.getUTCDate() + 1)
  }

  return dueDate
}

// ===== DE9 Quarter Deadlines =====

/**
 * 获取季度的截止日期信息 (for DE9 form)
 * Returns Date objects for consistent handling across the application
 */
export function getQuarterDeadlines(
  year: number,
  quarter: QuarterNumber,
): IDe9HeaderData {
  const { startDate, endDate } = getQuarterDates(year, quarter)

  // Due date: 季度结束后第一个月的第一天 (UTC)
  const dueMonth = endDate.getUTCMonth() + 1 // 下个月
  const dueYear = dueMonth > 11 ? year + 1 : year
  const dueMonthNormalized = dueMonth > 11 ? 0 : dueMonth
  const due = new Date(Date.UTC(dueYear, dueMonthNormalized, 1))

  // Delinquent: 季度结束后第一个月的月底 (UTC)
  const delinquent = new Date(Date.UTC(dueYear, dueMonthNormalized + 1, 0))

  return {
    quarterStarted: startDate,
    quarterEnded: endDate,
    due,
    delinquent,
    year: String(year),
    quarter: String(quarter),
  }
}
