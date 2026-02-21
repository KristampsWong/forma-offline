/**
 * Bug 5: getMonth() vs getUTCMonth() in getMonthlyLiabilitiesForQuarter
 *
 * calc941.tsx:187,192 uses .getMonth() (local time) for monthly liability grouping.
 * Payroll dates are stored as UTC midnight (e.g., "2025-04-01T00:00:00Z").
 * In US timezones (UTC-5 to UTC-8), getMonth() shifts the 1st of the month
 * back to the prior month (e.g., April 1 UTC → March 31 local → month 2).
 *
 * This test uses payDates on the 1st of each month in Q2 (April, May, June).
 * It asserts correct UTC-based month bucketing.
 *
 * Expected: FAILS in US timezones (demonstrates the bug).
 * In UTC environments, getMonth() === getUTCMonth() so the bug is latent.
 */
import { describe, it, expect } from "vitest"
import {
  getMonthlyLiabilitiesForQuarter,
  type PayrollTaxLiability,
} from "@/lib/tax/calc941"

function makePayroll(
  isoDate: string,
  federalIncomeTax: number,
): PayrollTaxLiability {
  return {
    payDate: new Date(isoDate),
    federalIncomeTax,
    employeeSocialSecurityTax: 0,
    employerSocialSecurityTax: 0,
    employeeMedicareTax: 0,
    employerMedicareTax: 0,
  }
}

describe("Bug 5: getMonthlyLiabilitiesForQuarter — getMonth() vs getUTCMonth()", () => {
  it("assigns Q2 payrolls at UTC midnight on 1st-of-month to correct month buckets", () => {
    // Q2 payrolls: April 1, May 1, June 1 — all at UTC midnight
    const payrolls: PayrollTaxLiability[] = [
      makePayroll("2025-04-01T00:00:00Z", 1000),
      makePayroll("2025-05-01T00:00:00Z", 2000),
      makePayroll("2025-06-01T00:00:00Z", 3000),
    ]

    const [month1, month2, month3] = getMonthlyLiabilitiesForQuarter(payrolls)

    // Month 1 (April) should have 1000, Month 2 (May) 2000, Month 3 (June) 3000
    expect(month1).toBe(1000)
    expect(month2).toBe(2000)
    expect(month3).toBe(3000)
  })

  it("assigns Q1 payrolls at UTC midnight on 1st-of-month to correct month buckets", () => {
    // Q1 payrolls: Jan 1, Feb 1, Mar 1 — all at UTC midnight
    const payrolls: PayrollTaxLiability[] = [
      makePayroll("2025-01-01T00:00:00Z", 500),
      makePayroll("2025-02-01T00:00:00Z", 600),
      makePayroll("2025-03-01T00:00:00Z", 700),
    ]

    const [month1, month2, month3] = getMonthlyLiabilitiesForQuarter(payrolls)

    // Month 1 (Jan) should have 500, Month 2 (Feb) 600, Month 3 (Mar) 700
    expect(month1).toBe(500)
    expect(month2).toBe(600)
    expect(month3).toBe(700)
  })

  it("handles multiple payrolls in the same month correctly", () => {
    // Two payrolls in April, one in May, one in June
    const payrolls: PayrollTaxLiability[] = [
      makePayroll("2025-04-01T00:00:00Z", 400),
      makePayroll("2025-04-15T00:00:00Z", 600),
      makePayroll("2025-05-01T00:00:00Z", 1000),
      makePayroll("2025-06-01T00:00:00Z", 2000),
    ]

    const [month1, month2, month3] = getMonthlyLiabilitiesForQuarter(payrolls)

    expect(month1).toBe(1000) // April: 400 + 600
    expect(month2).toBe(1000) // May
    expect(month3).toBe(2000) // June
  })
})
