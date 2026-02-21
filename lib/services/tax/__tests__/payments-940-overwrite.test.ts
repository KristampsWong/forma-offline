/**
 * Bug 9: Overwriting paid 940 payment records (FIXED)
 *
 * payments.ts now guards against overwriting financial fields (futaEmployer, totalTax)
 * when the existing record has status "paid". Only non-financial fields are updated.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db/dbConnect", () => ({ default: vi.fn() }))
vi.mock("@/models/company", () => ({
  default: {
    findOne: vi.fn(),
  },
}))

const mockPayrollFind = vi.fn()
vi.mock("@/models/payroll", () => ({
  default: {
    find: (...args: unknown[]) => mockPayrollFind(...args),
  },
}))

const mockFederal941FindOneAndUpdate = vi.fn()
const mockFederal940FindOneAndUpdate = vi.fn()
const mockFederal940Find = vi.fn()
const mockCAPitSdiFindOneAndUpdate = vi.fn()
const mockCASuiEttFindOneAndUpdate = vi.fn()

vi.mock("@/models/taxpayment", () => ({
  Federal941Payment: {
    findOneAndUpdate: (...args: unknown[]) =>
      mockFederal941FindOneAndUpdate(...args),
  },
  Federal940Payment: {
    find: (...args: unknown[]) => mockFederal940Find(...args),
    findOneAndUpdate: (...args: unknown[]) =>
      mockFederal940FindOneAndUpdate(...args),
  },
  CAPitSdiPayment: {
    findOneAndUpdate: (...args: unknown[]) =>
      mockCAPitSdiFindOneAndUpdate(...args),
  },
  CASuiEttPayment: {
    findOneAndUpdate: (...args: unknown[]) =>
      mockCASuiEttFindOneAndUpdate(...args),
  },
}))

vi.mock("@/lib/tax/deadlines", () => ({
  getQuarter: vi.fn(() => "Q1"),
  getQuarterDateRange: vi.fn(() => ({
    start: new Date("2025-01-01T00:00:00Z"),
    end: new Date("2025-03-31T00:00:00Z"),
  })),
  calculate15thDueDate: vi.fn(() => new Date("2025-02-15T00:00:00Z")),
  calculateQuarterlyDueDate: vi.fn(() => new Date("2025-04-30T00:00:00Z")),
}))

vi.mock("@/lib/date/utils", () => ({
  getMonthDateRange: vi.fn(() => ({
    start: new Date("2025-01-01T00:00:00Z"),
    end: new Date("2025-01-31T00:00:00Z"),
  })),
}))

vi.mock("@/lib/constants/errors", () => ({
  COMPANY_ERRORS: { NOT_FOUND: "Company not found" },
}))

import { syncAllTaxPaymentsFromApprovedPayrolls } from "@/lib/services/tax/payments"
import Company from "@/models/company"

function setupMocks(existing940Status: string) {
  vi.mocked(Company.findOne).mockResolvedValue({
    _id: "company-id-123",
  })

  const fakePayrolls = [
    {
      _id: "payroll-new",
      payPeriod: {
        startDate: new Date("2025-01-01T00:00:00Z"),
        endDate: new Date("2025-01-31T00:00:00Z"),
      },
      deductions: {
        taxes: {
          federalIncomeTax: 500,
          socialSecurityTax: 310,
          medicareTax: 72.5,
          stateIncomeTax: 200,
          sdi: 55,
        },
      },
      employerTaxes: {
        socialSecurityTax: 310,
        medicareTax: 72.5,
        futa: 42,
        sui: 50,
        ett: 5,
      },
    },
  ]
  mockPayrollFind.mockReturnValue(fakePayrolls)

  const existing940 = [
    {
      _id: "940-record",
      quarter: "Q1",
      status: existing940Status,
      futaEmployer: 30,
    },
  ]
  const sortChain = { sort: vi.fn(() => existing940) }
  mockFederal940Find.mockReturnValue(sortChain)

  mockFederal941FindOneAndUpdate.mockResolvedValue({
    _id: "941-id",
    totalTax: 1265,
    status: "pending",
  })
  mockFederal940FindOneAndUpdate.mockResolvedValue({
    _id: "940-id",
    totalTax: 42,
    status: existing940Status,
  })
  mockCAPitSdiFindOneAndUpdate.mockResolvedValue({
    _id: "pitsdi-id",
    totalTax: 255,
    status: "pending",
  })
  mockCASuiEttFindOneAndUpdate.mockResolvedValue({
    _id: "suiett-id",
    totalTax: 55,
    status: "pending",
  })
}

describe("Bug 9: 940 payment record overwrite guard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does NOT overwrite futaEmployer/totalTax when existing record is paid", async () => {
    setupMocks("paid")

    const result = await syncAllTaxPaymentsFromApprovedPayrolls(
      "user-123",
      new Date("2025-01-31T00:00:00Z"),
    )

    expect(result.success).toBe(true)
    expect(mockFederal940FindOneAndUpdate).toHaveBeenCalled()

    const setFields = mockFederal940FindOneAndUpdate.mock.calls[0][1].$set

    // Financial fields should NOT be in $set for paid records
    expect(setFields).not.toHaveProperty("futaEmployer")
    expect(setFields).not.toHaveProperty("totalTax")

    // Non-financial fields should still be updated
    expect(setFields).toHaveProperty("payrollIds")
    expect(setFields).toHaveProperty("dueDate")
  })

  it("DOES update futaEmployer/totalTax when existing record is pending", async () => {
    setupMocks("pending")

    const result = await syncAllTaxPaymentsFromApprovedPayrolls(
      "user-123",
      new Date("2025-01-31T00:00:00Z"),
    )

    expect(result.success).toBe(true)
    expect(mockFederal940FindOneAndUpdate).toHaveBeenCalled()

    const setFields = mockFederal940FindOneAndUpdate.mock.calls[0][1].$set

    // Financial fields SHOULD be updated for pending records
    expect(setFields).toHaveProperty("futaEmployer", 42)
    expect(setFields).toHaveProperty("totalTax", 42)
  })
})
