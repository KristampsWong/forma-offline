/**
 * Bug 7: DE9/DE9C upserts clobber existing data
 *
 * de9.ts:185-198 and de9c.ts:111-126 pass plain objects to findOneAndUpdate
 * instead of using $set/$setOnInsert. This replaces the entire document on
 * update, resetting status/filingStatus from "filed" back to "computed".
 *
 * Form 941 correctly uses $set (form941.ts:394-408).
 *
 * This test mocks the Mongoose models to capture the update argument
 * and verify whether $set is used.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ===== DE 9 Mocks =====

const mockDe9FindOneAndUpdate = vi.fn()
vi.mock("@/models/de9", () => ({
  default: {
    findOneAndUpdate: (...args: unknown[]) => mockDe9FindOneAndUpdate(...args),
  },
}))

const mockDe9cFindOneAndUpdate = vi.fn()
vi.mock("@/models/de9c", () => ({
  default: {
    findOneAndUpdate: (...args: unknown[]) =>
      mockDe9cFindOneAndUpdate(...args),
  },
}))

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
vi.mock("@/models/taxpayment", () => ({
  CAPitSdiPayment: {
    find: vi.fn(),
  },
  CASuiEttPayment: {
    find: vi.fn(),
  },
}))

vi.mock("@/lib/tax/calc-de9", () => ({
  calcDe9: vi.fn(() => ({
    totalSubjectWages: 10000,
    totalUiTaxableWages: 7000,
    totalUiContrib: 238,
    totalEttContrib: 7,
    totalSdiTaxableWages: 10000,
    totalSdiWithheld: 110,
    totalPitWithheld: 500,
    subtotal: 855,
  })),
  formatEinForDe9: vi.fn((ein: string) => ein),
  formatDe9Amount: vi.fn((amt: number) => String(amt.toFixed(2))),
  formatDe9Rate: vi.fn((rate: number) => String(rate)),
  getSdiRate: vi.fn(() => 0.011),
}))

vi.mock("@/lib/tax/calc-de9c", () => ({
  calcDe9c: vi.fn(() => ({
    employees: [
      {
        ssn: "***-**-1234",
        firstName: "John",
        mi: "",
        lastName: "Doe",
        totalSubjectWages: "10000.00",
        totalPitWages: "10000.00",
        totalPitWithheld: "500.00",
      },
    ],
    employeeCounts: { total: 1 },
    grandTotals: {
      totalSubjectWages: "10000.00",
      totalPitWages: "10000.00",
      totalPitWithheld: "500.00",
    },
  })),
}))

vi.mock("@/lib/tax/deadlines", () => ({
  getQuarterDates: vi.fn(() => ({
    startDate: new Date("2025-04-01T00:00:00Z"),
    endDate: new Date("2025-06-30T00:00:00Z"),
  })),
  getQuarterDeadlines: vi.fn(() => ({
    quarterStarted: "04/01/2025",
    quarterEnded: "06/30/2025",
    due: "07/31/2025",
    delinquent: "08/01/2025",
  })),
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

import { createOrUpdateDe9FormData } from "@/lib/services/tax/de9"
import { createOrUpdateDe9cFormData } from "@/lib/services/tax/de9c"
import Company from "@/models/company"
import Payroll from "@/models/payroll"
import { CAPitSdiPayment, CASuiEttPayment } from "@/models/taxpayment"

// Helper for chainable query mocks
function chainable(result: unknown) {
  const chain = {
    sort: vi.fn(() => chain),
    select: vi.fn(() => chain),
    lean: vi.fn(() => result),
  }
  return chain
}

describe("Bug 7: DE9 upsert clobbers existing status", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Common setup
    vi.mocked(Company.findOne).mockResolvedValue({
      _id: "company-id-123",
      name: "Test Corp",
      ein: "12-3456789",
      address: {
        line1: "123 Main St",
        city: "San Francisco",
        state: "CA",
        zip: "94102",
      },
      currentStateRate: {
        state: "CA",
        eddAccountNumber: "123-4567-8",
        UIRate: 0.034,
        ETTRate: 0.001,
        effectiveDate: new Date("2025-01-01T00:00:00Z"),
      },
    } as never)

    vi.mocked(Payroll.find).mockReturnValue(
      [
        {
          _id: "payroll-1",
          employeeId: "emp-1",
          payPeriod: {
            startDate: new Date("2025-04-01T00:00:00Z"),
            endDate: new Date("2025-04-30T00:00:00Z"),
          },
          earnings: { totalGrossPay: 10000 },
          deductions: {
            taxes: { stateIncomeTax: 500, sdi: 110 },
          },
          employerTaxes: { sui: 238, ett: 7 },
          employeeInfo: {
            firstName: "John",
            lastName: "Doe",
            middleName: "",
            ssn: "***-**-1234",
          },
        },
      ] as never,
    )
  })

  it("DE9: findOneAndUpdate should use $set operator to preserve status field", async () => {
    // Mock payment queries
    const pitChain = chainable([])
    vi.mocked(CAPitSdiPayment.find).mockReturnValue(pitChain as never)
    const suiChain = chainable([])
    vi.mocked(CASuiEttPayment.find).mockReturnValue(suiChain as never)

    mockDe9FindOneAndUpdate.mockResolvedValue({ _id: "de9-id" })

    await createOrUpdateDe9FormData("user-123", 2025, 2)

    // Verify findOneAndUpdate was called
    expect(mockDe9FindOneAndUpdate).toHaveBeenCalled()

    // Get the update argument (2nd arg to findOneAndUpdate)
    const updateArg = mockDe9FindOneAndUpdate.mock.calls[0][1]

    // The update arg should use $set to avoid clobbering status/filedAt/filedBy
    // Current buggy code passes a plain object without $set
    expect(updateArg).toHaveProperty("$set")
  })

  it("DE9C: findOneAndUpdate should use $set operator to preserve status field", async () => {
    mockDe9cFindOneAndUpdate.mockResolvedValue({ _id: "de9c-id" })

    await createOrUpdateDe9cFormData("user-123", 2025, 2)

    // Verify findOneAndUpdate was called
    expect(mockDe9cFindOneAndUpdate).toHaveBeenCalled()

    // Get the update argument (2nd arg to findOneAndUpdate)
    const updateArg = mockDe9cFindOneAndUpdate.mock.calls[0][1]

    // The update arg should use $set to avoid clobbering status/filedAt/filedBy
    // Current buggy code passes a plain object without $set
    expect(updateArg).toHaveProperty("$set")
  })
})
