/**
 * Tax Filing Update Service
 *
 * Handles marking tax filings as filed and auto-marking
 * corresponding tax payments as paid.
 */
import dbConnect from "@/lib/db/dbConnect"
import Company from "@/models/company"
import Form941 from "@/models/form941"
import Form940 from "@/models/form940"
import De9 from "@/models/de9"
import De9c from "@/models/de9c"
import {
  Federal941Payment,
  Federal940Payment,
  CAPitSdiPayment,
  CASuiEttPayment,
} from "@/models/taxpayment"
import type { TaxPaymentType } from "@/lib/constants/tax-constants"
import type { QuarterNumber } from "@/types/quarter"
import { COMPANY_ERRORS } from "@/lib/constants/errors"
import { createModuleLogger } from "@/lib/logger"
import { getYearDateRange } from "@/lib/date/utils"
import { createOrUpdateForm941FromApprovedPayrolls } from "@/lib/services/tax/form941"
import { createOrUpdateForm940FromApprovedPayrolls } from "@/lib/services/tax/form940"
import { createOrUpdateDe9FormData } from "@/lib/services/tax/de9"
import { recalculateFederal940RequiresImmediatePayment } from "@/lib/services/tax/payments"

const logger = createModuleLogger("filing-updates")

export type FilingType = "941" | "940" | "de9" | "de9c"

/**
 * Mark a tax filing as filed and auto-mark corresponding payments as paid.
 */
export async function markFilingAsFiledCore(
  userId: string,
  filingType: FilingType,
  filingId: string,
  filedDate?: string,
): Promise<void> {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id")
  if (!company) throw new Error(COMPANY_ERRORS.NOT_FOUND)

  const filedDateValue = filedDate ? new Date(filedDate) : new Date()
  const companyFilter = { _id: filingId, companyId: company._id }

  let quarter: string | undefined
  let year: number | undefined

  if (filingType === "de9") {
    const result = await De9.findOneAndUpdate(
      companyFilter,
      { status: "filed", filedAt: filedDateValue },
      { returnDocument: 'after' },
    )
    if (!result) throw new Error("Filing not found")
    quarter = result.quarter
    year = result.year
  } else if (filingType === "de9c") {
    const result = await De9c.findOneAndUpdate(
      companyFilter,
      { status: "filed", filedAt: filedDateValue },
      { returnDocument: 'after' },
    )
    if (!result) throw new Error("Filing not found")
    // DE9C has no associated payments
    return
  } else if (filingType === "941") {
    const result = await Form941.findOneAndUpdate(
      companyFilter,
      { filingStatus: "filed", filedDate: filedDateValue },
      { returnDocument: 'after' },
    )
    if (!result) throw new Error("Filing not found")
    quarter = result.quarter
    year = result.year
  } else {
    // 940
    const result = await Form940.findOneAndUpdate(
      companyFilter,
      { filingStatus: "filed", filedDate: filedDateValue },
      { returnDocument: 'after' },
    )
    if (!result) throw new Error("Filing not found")
    year = result.year
  }

  // Auto-mark corresponding payments as paid
  if (!year) return

  const paymentUpdate = { status: "paid" as const, paidDate: filedDateValue }

  if (filingType === "941" && quarter) {
    await Federal941Payment.updateMany(
      { companyId: company._id, quarter, year, status: "pending" },
      paymentUpdate,
    )
  } else if (filingType === "940") {
    await Federal940Payment.updateMany(
      { companyId: company._id, year, status: "pending" },
      paymentUpdate,
    )
  } else if (filingType === "de9" && quarter) {
    await Promise.all([
      CAPitSdiPayment.updateMany(
        { companyId: company._id, quarter, year, status: "pending" },
        paymentUpdate,
      ),
      CASuiEttPayment.updateMany(
        { companyId: company._id, quarter, year, status: "pending" },
        paymentUpdate,
      ),
    ])
  }

  logger.info(
    `Marked ${filingType} filing ${filingId} as filed, auto-paid related payments`,
  )
}

/**
 * Mark a single tax payment as paid, then recalculate dependent forms.
 *
 * - federal941 → recalculate Form 941 (Line 13 totalDepositsForQuarter)
 * - federal940 → recalculate requiresImmediatePayment + Form 940 (Line 13 FUTA deposited)
 * - caPitSdi / caSuiEtt → recalculate DE9 (Line I contributions paid this quarter)
 */
export async function markTaxPaymentAsPaidCore(
  userId: string,
  paymentId: string,
  taxPaymentType: TaxPaymentType,
  paidDate: Date,
  paymentMethod?: string,
  confirmationNumber?: string,
): Promise<void> {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id")
  if (!company) throw new Error(COMPANY_ERRORS.NOT_FOUND)

  const filter = { _id: paymentId, companyId: company._id }

  // Use find + save so we can conditionally set optional fields
  let taxPayment
  if (taxPaymentType === "federal941") {
    taxPayment = await Federal941Payment.findOne(filter)
  } else if (taxPaymentType === "federal940") {
    taxPayment = await Federal940Payment.findOne(filter)
  } else if (taxPaymentType === "caPitSdi") {
    taxPayment = await CAPitSdiPayment.findOne(filter)
  } else {
    taxPayment = await CASuiEttPayment.findOne(filter)
  }

  if (!taxPayment) throw new Error("Payment not found")

  taxPayment.status = "paid"
  taxPayment.paidDate = paidDate
  if (paymentMethod) taxPayment.paymentMethod = paymentMethod
  if (confirmationNumber) taxPayment.confirmationNumber = confirmationNumber
  await taxPayment.save()

  logger.info(`Marked ${taxPaymentType} payment ${paymentId} as paid`)

  // Recalculate dependent forms
  if (taxPaymentType === "federal941") {
    const periodEnd = new Date(taxPayment.periodEnd)
    const res = await createOrUpdateForm941FromApprovedPayrolls(userId, periodEnd)
    if (!res.success) {
      logger.warn(`Failed to recalculate Form 941 after payment: ${res.error}`)
    }
  }

  if (taxPaymentType === "federal940") {
    const res940Recalc = await recalculateFederal940RequiresImmediatePayment(
      company._id.toString(),
      taxPayment.year,
    )
    if (!res940Recalc.success) {
      logger.warn(`Failed to recalculate 940 requiresImmediate: ${res940Recalc.error}`)
    }

    const { end: periodEnd } = getYearDateRange(taxPayment.year)
    const res940Form = await createOrUpdateForm940FromApprovedPayrolls(userId, periodEnd)
    if (!res940Form.success) {
      logger.warn(`Failed to recalculate Form 940 after payment: ${res940Form.error}`)
    }
  }

  if (taxPaymentType === "caPitSdi" || taxPaymentType === "caSuiEtt") {
    if (!taxPayment.quarter) return
    const quarterNum = Number.parseInt(
      taxPayment.quarter.replace("Q", ""),
      10,
    ) as QuarterNumber
    const resDe9 = await createOrUpdateDe9FormData(userId, taxPayment.year, quarterNum)
    if (!resDe9.success) {
      logger.warn(`Failed to recalculate DE9 after CA payment: ${resDe9.error}`)
    }
  }
}
