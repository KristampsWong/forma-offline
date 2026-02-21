/**
 * Bug 6: Monthly deposit amounts mis-indexed in form941.ts
 *
 * form941.ts:322-334 queries Federal941Payment with status: "paid",
 * then accesses [0], [1], [2] positionally assuming 3 records in month order.
 *
 * If month 2 is unpaid (still "pending"), the query returns only 2 records.
 * Then [1] maps to month 3's deposit instead of month 2's, and month 3 gets 0.
 *
 * This test mocks the full service chain to demonstrate the positional indexing bug.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock all dependencies before importing the module under test
vi.mock("@/lib/db/dbConnect", () => ({ default: vi.fn() }))
vi.mock("@/models/company", () => ({
  default: {
    findOne: vi.fn(),
  },
}))
vi.mock("@/models/payroll", () => ({
  default: {
    find: vi.fn(),
  },
}))
vi.mock("@/models/form941", () => ({
  default: {
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
}))

const mockFederal941PaymentFind = vi.fn()
vi.mock("@/models/taxpayment", () => ({
  Federal941Payment: {
    find: (...args: unknown[]) => mockFederal941PaymentFind(...args),
  },
}))

// Mock calc941 to return deterministic results
vi.mock("@/lib/tax/calc941", () => ({
  calc941: vi.fn(() => ({
    totalWages: 10000,
    federalIncomeTaxWithheld: 1500,
    line5a_socialSecurityWages: 10000,
    line5a_socialSecurityTax: 620,
    line5c_medicareWagesTips: 10000,
    line5c_medicareTax: 145,
    line5d_medicareWagesTipsSubjectToAdditional: 0,
    line5d_additionalMedicareTax: 0,
    line5e_totalSocialSecurityMedicareTax: 765,
    totalTaxesBeforeAdjustments: 2265,
    currentQuarterAdjustments: 0,
    totalTaxesAfterAdjustments: 2265,
    totalTaxesAfterAdjustmentsAndCredits: 2265,
    totalDepositsForQuarter: 2265,
    balanceDue: 0,
    overpayment: 0,
  })),
  calculate941Line16: vi.fn(() => ({
    isSemiweeklyScheduleDepositor: false,
    monthlyTaxLiability: { month1: 755, month2: 755, month3: 755 },
    scheduleB: null,
  })),
  calculateFractionsOfCentsAdjustment: vi.fn(() => 0),
  calculateLookbackTotalTax: vi.fn(() => 0),
  checkHundredKRule: vi.fn(() => false),
  getMonthlyLiabilitiesForQuarter: vi.fn(
    (): [number, number, number] => [755, 755, 755],
  ),
  getPerEmployeeRoundedTax: vi.fn(() => 765),
  getTotalAMTWages: vi.fn(() => 0),
  getTotalSSTaxableWages: vi.fn(() => 10000),
}))

vi.mock("@/lib/tax/deadlines", () => ({
  getQuarter: vi.fn(() => "Q2"),
  getQuarterDateRange: vi.fn(() => ({
    start: new Date("2025-04-01T00:00:00Z"),
    end: new Date("2025-06-30T00:00:00Z"),
  })),
  calculateQuarterlyDueDate: vi.fn(() => new Date("2025-07-31T00:00:00Z")),
}))

vi.mock("@/lib/date/utils", () => ({
  getYearDateRange: vi.fn(() => ({
    start: new Date("2025-01-01T00:00:00Z"),
    end: new Date("2025-12-31T00:00:00Z"),
  })),
}))

vi.mock("@/lib/constants/errors", () => ({
  COMPANY_ERRORS: { NOT_FOUND: "Company not found" },
}))

import { createOrUpdateForm941FromApprovedPayrolls } from "@/lib/services/tax/form941"
import { calc941 } from "@/lib/tax/calc941"
import Company from "@/models/company"
import Payroll from "@/models/payroll"
import Form941 from "@/models/form941"

// Helper to create a chainable query mock
function chainable(result: unknown) {
  const chain = {
    sort: vi.fn(() => chain),
    select: vi.fn(() => chain),
    lean: vi.fn(() => result),
  }
  return chain
}

describe("Bug 6: Monthly deposit amounts — month-aware indexing", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("misassigns month 3 deposit to month 2 when month 2 is unpaid", async () => {
    // Setup: Company exists
    vi.mocked(Company.findOne).mockResolvedValue({
      _id: "company-id-123",
    })

    // Setup: Payroll records exist (quarterly + YTD)
    const fakePayrolls = [
      {
        _id: "payroll-1",
        employeeId: "emp-1",
        payPeriod: {
          startDate: new Date("2025-04-01T00:00:00Z"),
          endDate: new Date("2025-04-30T00:00:00Z"),
          payDate: new Date("2025-04-30T00:00:00Z"),
        },
        earnings: { totalGrossPay: 5000 },
        deductions: {
          taxes: {
            federalIncomeTax: 500,
            socialSecurityTax: 310,
            medicareTax: 72.5,
            stateIncomeTax: 0,
            sdi: 0,
          },
        },
        employerTaxes: {
          socialSecurityTax: 310,
          medicareTax: 72.5,
          futa: 0,
          sui: 0,
          ett: 0,
        },
      },
    ]
    const payrollChain = chainable(fakePayrolls)
    vi.mocked(Payroll.find).mockReturnValue(payrollChain as never)

    // KEY SETUP: Federal941Payment query returns only 2 records (month 2 is unpaid)
    // Month 1 (April) = paid $800, Month 2 (May) = NOT paid, Month 3 (June) = paid $900
    const paidRecords = [
      {
        totalTax: 800,
        periodStart: new Date("2025-04-01T00:00:00Z"),
      },
      // Month 2 (May) is missing — it's "pending", not "paid"
      {
        totalTax: 900,
        periodStart: new Date("2025-06-01T00:00:00Z"),
      },
    ]
    const federal941Chain = chainable(paidRecords)
    mockFederal941PaymentFind.mockReturnValue(federal941Chain)

    // Setup: No lookback forms
    const lookbackChain = chainable([])
    vi.mocked(Form941.find).mockReturnValue(lookbackChain as never)

    // Setup: Form941 upsert
    vi.mocked(Form941.findOneAndUpdate).mockResolvedValue({
      _id: "form941-id",
      filingStatus: "ready_to_file",
    })

    // Execute
    await createOrUpdateForm941FromApprovedPayrolls(
      "user-123",
      new Date("2025-06-30T00:00:00Z"),
    )

    // Verify: calc941 was called with the deposit amounts
    const calc941Mock = vi.mocked(calc941)
    expect(calc941Mock).toHaveBeenCalled()

    // Fixed: deposits are now mapped by periodStart month, not positional index
    const callArgs = calc941Mock.mock.calls[0]
    const month1Deposit = callArgs[5] // 6th arg = month1
    const month2Deposit = callArgs[6] // 7th arg = month2
    const month3Deposit = callArgs[7] // 8th arg = month3

    // Correct behavior: month-aware indexing
    // April (month 3) → idx 0 = 800
    // May (month 4) → idx 1 = 0 (unpaid, no record)
    // June (month 5) → idx 2 = 900
    expect(month1Deposit).toBe(800)
    expect(month2Deposit).toBe(0) // May is unpaid — correctly 0
    expect(month3Deposit).toBe(900) // June — correctly 900
  })
})
