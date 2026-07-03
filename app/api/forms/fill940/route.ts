import fs from "node:fs"
import { type NextRequest, NextResponse } from "next/server"
import { PDFDocument, type PDFForm } from "pdf-lib"
import { getForm940FilingById } from "@/actions/taxes"
import {
  getEffectiveFormYear,
  getForm940Fields,
  getPdfFormPath,
} from "@/lib/constants/pdf-forms"
import { type TaxYear, getTaxRatesByYear } from "@/lib/constants/tax-rates"
import { logger } from "@/lib/logger"

export async function GET(req: NextRequest) {
  const form940Id = req.nextUrl.searchParams.get("id")

  if (!form940Id) {
    return NextResponse.json(
      { message: "Form 940 ID is required." },
      { status: 400 },
    )
  }

  try {
    const result = await getForm940FilingById(form940Id)

    if (!result.success) {
      return NextResponse.json(
        { message: result.error },
        { status: 404 },
      )
    }

    const { form940, company } = result.data

    // All PDF field names come from a version-specific map resolved by the
    // effective PDF revision year (not the raw tax year), so the names always
    // match the template actually loaded on disk.
    const effectiveYear = getEffectiveFormYear("940", form940.year)
    const fields = getForm940Fields(effectiveYear)

    // Get tax rates for the form year
    const rates = getTaxRatesByYear(form940.year as TaxYear)
    const CA_FUTA_CREDIT_REDUCTION_RATE =
      rates.california.futaCreditReductionRate

    const pdfPath = getPdfFormPath("940", form940.year)
    const formPdfBytes = fs.readFileSync(pdfPath)

    const pdfDoc = await PDFDocument.load(formPdfBytes)
    const form = pdfDoc.getForm()

    // Company information
    const companyName = company.name
    const ein = company.ein.replace("-", "")
    const { line1, line2, city, state, zip } = company.address
    const address = line2 ? `${line1}, ${line2}` : line1

    // Form 940 data from database
    const totalPaymentsToEmployees = form940.line3_totalPaymentsToEmployees
    const paymentsExceedingLimit = form940.line5_paymentsExceedingLimit
    const subtotal6 = form940.line6_subtotal
    const totalTaxableFUTAWages = form940.line7_totalTaxableFUTAWages
    const FUTATaxbeforeAdjustments = form940.line8_futaTaxBeforeAdjustments

    // Part 3 - Adjustments
    const line9Adjustment = form940.line9_adjustment || 0
    const line10Adjustment = form940.line10_adjustment || 0
    const creditReduction = form940.line11_creditReduction || 0

    const TotalFUTATaxAfterAdjustments =
      form940.line12_totalFUTATaxAfterAdjustments

    const FUTATaxDespositedForYear = form940.line13_futaTaxDeposited
    const BalanceDue = form940.line14_balanceDue
    const overpayment = form940.line15_overpayment

    // Part 5 - Quarterly liability (only if total FUTA tax > $500)
    const quarterlyLiability = form940.quarterlyLiability
    const FUTATaxLiabilityQuarter1 = quarterlyLiability?.q1 || 0
    const FUTATaxLiabilityQuarter2 = quarterlyLiability?.q2 || 0
    const FUTATaxLiabilityQuarter3 = quarterlyLiability?.q3 || 0
    const FUTATaxLiabilityQuarter4 = quarterlyLiability?.q4 || 0
    const TotalFUTAXTaxLiability = quarterlyLiability?.total || 0

    // ===== Header - Company Information =====
    const einParts = [ein.slice(0, 2), ein.slice(2)]
    form.getTextField(fields.einPart1).setText(einParts[0])
    form.getTextField(fields.einPart2).setText(einParts[1])
    form.getTextField(fields.companyName).setText(companyName)
    form.getTextField(fields.addressLine).setText(address)
    form.getTextField(fields.city).setText(city)
    form.getTextField(fields.state).setText(state)
    form.getTextField(fields.zip).setText(zip)

    /** Part 1 */
    /** 1a - State abbreviation (first two characters) */
    const stateAbbrev = form940.stateUnemploymentTaxStates?.[0] || state || "CA"
    form.getTextField(fields.line1aStateChar1).setText(stateAbbrev.charAt(0))
    form.getTextField(fields.line1aStateChar2).setText(stateAbbrev.charAt(1))

    /** 2 check for CA and VI only - check if state is CA or VI */
    if (stateAbbrev === "CA" || stateAbbrev === "VI") {
      form.getCheckBox(fields.line2CreditReductionCheckbox).check()
    }

    /** Part 2 - Determine your FUTA tax before adjustments */
    /** 3 - Total payments to all employees */
    fillCurrencyField(
      form,
      totalPaymentsToEmployees,
      fields.line3Int,
      fields.line3Dec,
    )
    /** 5 - Payments made to each employee in excess of $7,000 */
    fillCurrencyField(
      form,
      paymentsExceedingLimit,
      fields.line5Int,
      fields.line5Dec,
    )
    /** 6 - Subtotal (line 4 + line 5) */
    fillCurrencyField(form, subtotal6, fields.line6Int, fields.line6Dec)
    /** 7 - Total taxable FUTA wages (line 3 - line 6) */
    fillCurrencyField(
      form,
      totalTaxableFUTAWages,
      fields.line7Int,
      fields.line7Dec,
    )
    /** 8 - FUTA tax before adjustments (line 7 x 0.006) */
    fillCurrencyField(
      form,
      FUTATaxbeforeAdjustments,
      fields.line8Int,
      fields.line8Dec,
    )

    /** Part 3 - Adjustments */
    /** 9 - If ALL wages excluded from state unemployment tax */
    if (line9Adjustment > 0) {
      fillCurrencyField(form, line9Adjustment, fields.line9Int, fields.line9Dec)
    }

    /** 10 - If SOME wages excluded from state unemployment tax */
    if (line10Adjustment > 0) {
      fillCurrencyField(
        form,
        line10Adjustment,
        fields.line10Int,
        fields.line10Dec,
      )
    }

    /** 11 - Credit reduction (if applicable) */
    if (creditReduction > 0) {
      fillCurrencyField(
        form,
        creditReduction,
        fields.line11Int,
        fields.line11Dec,
      )
    }

    /** Part 4 */
    /** 12 */
    fillCurrencyField(
      form,
      TotalFUTATaxAfterAdjustments,
      fields.line12Int,
      fields.line12Dec,
    )
    /** 13 */
    fillCurrencyField(
      form,
      FUTATaxDespositedForYear,
      fields.line13Int,
      fields.line13Dec,
    )

    /** 14 */
    fillCurrencyField(form, BalanceDue, fields.line14Int, fields.line14Dec)
    /** 15a */
    fillCurrencyField(
      form,
      overpayment,
      fields.line15aOverpaymentInt,
      fields.line15aOverpaymentDec,
    )
    /** 15b */
    form.getCheckBox(fields.line15bRefundCheckbox).check()
    /** Page 2 */

    /** Part 5 - Report your FUTA tax liability by quarter only if line 12 > $500 */
    if (TotalFUTATaxAfterAdjustments > 500 && quarterlyLiability) {
      /** 16a - Q1 liability */
      fillCurrencyField(
        form,
        FUTATaxLiabilityQuarter1,
        fields.line16aQ1Int,
        fields.line16aQ1Dec,
      )
      /** 16b - Q2 liability */
      fillCurrencyField(
        form,
        FUTATaxLiabilityQuarter2,
        fields.line16bQ2Int,
        fields.line16bQ2Dec,
      )
      /** 16c - Q3 liability */
      fillCurrencyField(
        form,
        FUTATaxLiabilityQuarter3,
        fields.line16cQ3Int,
        fields.line16cQ3Dec,
      )
      /** 16d - Q4 liability */
      fillCurrencyField(
        form,
        FUTATaxLiabilityQuarter4,
        fields.line16dQ4Int,
        fields.line16dQ4Dec,
      )
      /** 17 - Total must equal line 12 */
      fillCurrencyField(
        form,
        TotalFUTAXTaxLiability,
        fields.line17TotalInt,
        fields.line17TotalDec,
      )
    }
    /** Part 6 */
    form.getCheckBox(fields.part6ThirdPartyNoCheckbox).check()
    /** Page 3 940-V*/
    fillCurrencyField(
      form,
      BalanceDue,
      fields.voucherAmountInt,
      fields.voucherAmountDec,
    )

    /** Page 4 Schedule A - Required for CA (credit reduction state) */
    if (form940.isSubjectToCreditReduction && stateAbbrev === "CA") {
      // Check CA box
      form.getCheckBox(fields.scheduleACaCheckbox).check()

      // FUTA taxable wages for CA
      fillCurrencyField(
        form,
        totalTaxableFUTAWages,
        fields.scheduleACaFutaWagesInt,
        fields.scheduleACaFutaWagesDec,
      )

      // Credit reduction rate
      const reductionRatePercent = (
        CA_FUTA_CREDIT_REDUCTION_RATE * 100
      ).toFixed(1)
      form
        .getTextField(fields.scheduleACaReductionRate)
        .setText(reductionRatePercent)

      // Credit reduction amount
      fillCurrencyField(
        form,
        creditReduction,
        fields.scheduleACaReductionAmountInt,
        fields.scheduleACaReductionAmountDec,
      )

      // Total credit reduction
      fillCurrencyField(
        form,
        creditReduction,
        fields.scheduleATotalReductionInt,
        fields.scheduleATotalReductionDec,
      )
    }

    const pdfBytes = await pdfDoc.save()

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Form_940_${form940.year}_${companyName}.pdf"`,
      },
    })
  } catch (err) {
    logger.error("Error generating Form 940 PDF:", err)
    return NextResponse.json(
      { message: "Error generating Form 940 PDF" },
      { status: 500 },
    )
  }
}

function fillCurrencyField(
  form: PDFForm,
  value: number,
  intField: string,
  decimalField: string,
) {
  const rounded = value.toFixed(2)
  const [intPart, decimalPart] = rounded.split(".")

  form.getTextField(intField).setText(intPart)
  form.getTextField(decimalField).setText(decimalPart)
}
