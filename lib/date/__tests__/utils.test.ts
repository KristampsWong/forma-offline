import { describe, it, expect } from "vitest"
import {
  parseDateParam,
  formatDateParam,
  parseToUTCMidnight,
  extractDateOnly,
  getYearDateRange,
  getCurrentPayPeriod,
  parsePayrollDateParams,
} from "@/lib/date/utils"

// =============================================================================
// parseDateParam
// =============================================================================

describe("parseDateParam", () => {
  it("returns null for null/undefined/empty input", () => {
    expect(parseDateParam(null)).toBeNull()
    expect(parseDateParam(undefined)).toBeNull()
    expect(parseDateParam("")).toBeNull()
  })

  it("returns null for invalid format", () => {
    expect(parseDateParam("invalid")).toBeNull()
    expect(parseDateParam("2026-01-15")).toBeNull()
    expect(parseDateParam("1-15-2026")).toBeNull()
  })

  it("returns null for invalid dates", () => {
    expect(parseDateParam("13-01-2026")).toBeNull()
    expect(parseDateParam("01-32-2026")).toBeNull()
    expect(parseDateParam("02-30-2026")).toBeNull()
  })

  it("returns UTC midnight date", () => {
    const result = parseDateParam("01-15-2026")
    expect(result).not.toBeNull()
    expect(result!.getUTCFullYear()).toBe(2026)
    expect(result!.getUTCMonth()).toBe(0)
    expect(result!.getUTCDate()).toBe(15)
    expect(result!.getUTCHours()).toBe(0)
    expect(result!.getUTCMinutes()).toBe(0)
    expect(result!.getUTCSeconds()).toBe(0)
    expect(result!.getUTCMilliseconds()).toBe(0)
  })

  it("returns UTC midnight for month boundaries", () => {
    const result = parseDateParam("02-28-2026")
    expect(result).not.toBeNull()
    expect(result!.getUTCMonth()).toBe(1)
    expect(result!.getUTCDate()).toBe(28)
    expect(result!.getUTCHours()).toBe(0)
  })

  it("returns UTC midnight for Dec 31", () => {
    const result = parseDateParam("12-31-2026")
    expect(result).not.toBeNull()
    expect(result!.getUTCFullYear()).toBe(2026)
    expect(result!.getUTCMonth()).toBe(11)
    expect(result!.getUTCDate()).toBe(31)
    expect(result!.getUTCHours()).toBe(0)
  })

  it("returns UTC midnight for leap day", () => {
    const result = parseDateParam("02-29-2024")
    expect(result).not.toBeNull()
    expect(result!.getUTCMonth()).toBe(1)
    expect(result!.getUTCDate()).toBe(29)
  })

  it("rejects Feb 29 on non-leap year", () => {
    expect(parseDateParam("02-29-2026")).toBeNull()
  })
})

// =============================================================================
// formatDateParam
// =============================================================================

describe("formatDateParam", () => {
  it("formats UTC midnight dates correctly", () => {
    const date = new Date(Date.UTC(2026, 0, 15))
    expect(formatDateParam(date)).toBe("01-15-2026")
  })

  it("formats month boundaries correctly", () => {
    const date = new Date(Date.UTC(2026, 1, 28))
    expect(formatDateParam(date)).toBe("02-28-2026")
  })

  it("formats Dec 31 correctly", () => {
    const date = new Date(Date.UTC(2026, 11, 31))
    expect(formatDateParam(date)).toBe("12-31-2026")
  })

  it("pads single-digit months and days", () => {
    const date = new Date(Date.UTC(2026, 0, 5))
    expect(formatDateParam(date)).toBe("01-05-2026")
  })
})

// =============================================================================
// format → parse round-trip
// =============================================================================

describe("formatDateParam + parseDateParam round-trip", () => {
  it("round-trips correctly for mid-month dates", () => {
    const original = new Date(Date.UTC(2026, 0, 15))
    const formatted = formatDateParam(original)
    const parsed = parseDateParam(formatted)
    expect(parsed).not.toBeNull()
    expect(parsed!.getTime()).toBe(original.getTime())
  })

  it("round-trips correctly for month-end dates", () => {
    const original = new Date(Date.UTC(2026, 1, 28))
    const formatted = formatDateParam(original)
    const parsed = parseDateParam(formatted)
    expect(parsed).not.toBeNull()
    expect(parsed!.getTime()).toBe(original.getTime())
  })

  it("round-trips correctly for year boundaries", () => {
    const original = new Date(Date.UTC(2026, 11, 31))
    const formatted = formatDateParam(original)
    const parsed = parseDateParam(formatted)
    expect(parsed).not.toBeNull()
    expect(parsed!.getTime()).toBe(original.getTime())
  })

  it("round-trips correctly for Jan 1", () => {
    const original = new Date(Date.UTC(2026, 0, 1))
    const formatted = formatDateParam(original)
    const parsed = parseDateParam(formatted)
    expect(parsed).not.toBeNull()
    expect(parsed!.getTime()).toBe(original.getTime())
  })
})

// =============================================================================
// parseToUTCMidnight (regression)
// =============================================================================

describe("parseToUTCMidnight", () => {
  it("returns UTC midnight for valid MM/DD/YYYY input", () => {
    const result = parseToUTCMidnight("01/15/2024")
    expect(result).not.toBeNull()
    expect(result!.toISOString()).toBe("2024-01-15T00:00:00.000Z")
  })

  it("returns null for invalid input", () => {
    expect(parseToUTCMidnight("")).toBeNull()
    expect(parseToUTCMidnight("invalid")).toBeNull()
    expect(parseToUTCMidnight("13/01/2024")).toBeNull()
  })
})

// =============================================================================
// extractDateOnly (regression)
// =============================================================================

describe("extractDateOnly", () => {
  it("extracts UTC date from Date object", () => {
    const date = new Date("2024-01-15T00:00:00.000Z")
    expect(extractDateOnly(date)).toBe("01/15/2024")
  })

  it("extracts UTC date from ISO string", () => {
    expect(extractDateOnly("2024-01-15T00:00:00.000Z")).toBe("01/15/2024")
  })

  it("returns null for null/undefined", () => {
    expect(extractDateOnly(null)).toBeNull()
    expect(extractDateOnly(undefined)).toBeNull()
  })
})

// =============================================================================
// getYearDateRange (regression)
// =============================================================================

describe("getYearDateRange", () => {
  it("returns UTC boundaries for the year", () => {
    const { start, end } = getYearDateRange(2026)
    expect(start.toISOString()).toBe("2026-01-01T00:00:00.000Z")
    expect(end.toISOString()).toBe("2026-12-31T23:59:59.999Z")
  })
})

// =============================================================================
// getCurrentPayPeriod
// =============================================================================

describe("getCurrentPayPeriod", () => {
  it("returns UTC midnight dates for monthly periods", () => {
    const result = getCurrentPayPeriod("monthly")
    expect(result.start.getUTCHours()).toBe(0)
    expect(result.start.getUTCMinutes()).toBe(0)
    expect(result.start.getUTCSeconds()).toBe(0)
    expect(result.start.getUTCMilliseconds()).toBe(0)
    expect(result.start.getUTCDate()).toBe(1)

    expect(result.end.getUTCHours()).toBe(0)
    expect(result.end.getUTCMinutes()).toBe(0)
    expect(result.end.getUTCSeconds()).toBe(0)

    expect(result.payDate.getTime()).toBe(result.end.getTime())
  })

  it("returns UTC midnight dates for biweekly periods", () => {
    const result = getCurrentPayPeriod("biweekly")
    expect(result.start.getUTCHours()).toBe(0)
    expect(result.start.getUTCMinutes()).toBe(0)
    expect(result.start.getUTCSeconds()).toBe(0)

    expect(result.end.getUTCHours()).toBe(0)
    expect(result.end.getUTCMinutes()).toBe(0)
    expect(result.end.getUTCSeconds()).toBe(0)

    // Period should be 13 days apart (14 days inclusive)
    const diffMs = result.end.getTime() - result.start.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    expect(diffDays).toBe(13)
  })
})

// =============================================================================
// parsePayrollDateParams
// =============================================================================

describe("parsePayrollDateParams", () => {
  it("returns UTC midnight dates when all params are valid", () => {
    const result = parsePayrollDateParams({
      start: "01-01-2026",
      end: "01-31-2026",
      payDate: "01-31-2026",
    })
    expect(result.start.getUTCFullYear()).toBe(2026)
    expect(result.start.getUTCMonth()).toBe(0)
    expect(result.start.getUTCDate()).toBe(1)
    expect(result.start.getUTCHours()).toBe(0)

    expect(result.end.getUTCDate()).toBe(31)
    expect(result.end.getUTCHours()).toBe(0)
  })

  it("returns UTC midnight fallback when params are invalid", () => {
    const result = parsePayrollDateParams({
      start: "invalid",
      end: "01-31-2026",
      payDate: "01-31-2026",
    })
    expect(result.start.getUTCHours()).toBe(0)
    expect(result.start.getUTCMinutes()).toBe(0)
    expect(result.start.getUTCSeconds()).toBe(0)
    expect(result.start.getUTCMilliseconds()).toBe(0)
  })

  it("returns fallback when start > end", () => {
    const result = parsePayrollDateParams({
      start: "02-01-2026",
      end: "01-01-2026",
      payDate: "02-01-2026",
    })
    expect(result.start.getTime()).toBe(result.end.getTime())
    expect(result.start.getUTCHours()).toBe(0)
  })

  it("returns fallback when payDate < start", () => {
    const result = parsePayrollDateParams({
      start: "01-15-2026",
      end: "01-31-2026",
      payDate: "01-01-2026",
    })
    expect(result.start.getTime()).toBe(result.end.getTime())
    expect(result.start.getUTCHours()).toBe(0)
  })
})
