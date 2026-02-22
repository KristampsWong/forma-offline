import fs from "node:fs"
import { type NextRequest, NextResponse } from "next/server"
import { PDFDocument, type PDFForm } from "pdf-lib"
import { getForm940FilingById } from "@/actions/taxes"
import { getPdfFormPath } from "@/lib/constants/pdf-forms"
import { getTaxRates } from "@/lib/constants/tax-rates"
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

    // Get tax rates for the form year
    const rates = getTaxRates(new Date(form940.year, 0, 1))
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

    // EIN fields
    const einParts = [ein.slice(0, 2), ein.slice(2)]
    form
      .getTextField("topmostSubform[0].Page1[0].EntityArea[0].f1_1[0]")
      .setText(einParts[0])
    form
      .getTextField("topmostSubform[0].Page1[0].EntityArea[0].f1_2[0]")
      .setText(einParts[1])

    // Company name
    form
      .getTextField("topmostSubform[0].Page1[0].EntityArea[0].f1_3[0]")
      .setText(companyName)

    // Address
    form
      .getTextField("topmostSubform[0].Page1[0].EntityArea[0].f1_5[0]")
      .setText(address)

    // City
    form
      .getTextField("topmostSubform[0].Page1[0].EntityArea[0].f1_6[0]")
      .setText(city)

    // State
    form
      .getTextField("topmostSubform[0].Page1[0].EntityArea[0].f1_7[0]")
      .setText(state)

    // Zip Code
    form
      .getTextField("topmostSubform[0].Page1[0].EntityArea[0].f1_8[0]")
      .setText(zip)

    /** Part 1 */
    /** 1a - State abbreviation (first two characters) */
    const stateAbbrev = form940.stateUnemploymentTaxStates?.[0] || state || "CA"
    form
      .getTextField("topmostSubform[0].Page1[0].f1_12[0]")
      .setText(stateAbbrev.charAt(0))
    form
      .getTextField("topmostSubform[0].Page1[0].f1_13[0]")
      .setText(stateAbbrev.charAt(1))

    /** 2 check for CA and VI only - check if state is CA or VI */
    if (stateAbbrev === "CA" || stateAbbrev === "VI") {
      form.getCheckBox("topmostSubform[0].Page1[0].c1_7[0]").check()
    }

    /** Part 2 - Determine your FUTA tax before adjustments */
    /** 3 - Total payments to all employees */
    fillCurrencyField(
      form,
      totalPaymentsToEmployees,
      "topmostSubform[0].Page1[0].f1_14[0]",
      "topmostSubform[0].Page1[0].f1_15[0]",
    )
    /** 5 - Payments made to each employee in excess of $7,000 */
    fillCurrencyField(
      form,
      paymentsExceedingLimit,
      "topmostSubform[0].Page1[0].f1_18[0]",
      "topmostSubform[0].Page1[0].f1_19[0]",
    )
    /** 6 - Subtotal (line 4 + line 5) */
    fillCurrencyField(
      form,
      subtotal6,
      "topmostSubform[0].Page1[0].f1_20[0]",
      "topmostSubform[0].Page1[0].f1_21[0]",
    )
    /** 7 - Total taxable FUTA wages (line 3 - line 6) */
    fillCurrencyField(
      form,
      totalTaxableFUTAWages,
      "topmostSubform[0].Page1[0].f1_22[0]",
      "topmostSubform[0].Page1[0].f1_23[0]",
    )
    /** 8 - FUTA tax before adjustments (line 7 x 0.006) */
    fillCurrencyField(
      form,
      FUTATaxbeforeAdjustments,
      "topmostSubform[0].Page1[0].f1_24[0]",
      "topmostSubform[0].Page1[0].f1_25[0]",
    )

    /** Part 3 - Adjustments */
    /** 9 - If ALL wages excluded from state unemployment tax */
    if (line9Adjustment > 0) {
      fillCurrencyField(
        form,
        line9Adjustment,
        "topmostSubform[0].Page1[0].f1_26[0]",
        "topmostSubform[0].Page1[0].f1_27[0]",
      )
    }

    /** 10 - If SOME wages excluded from state unemployment tax */
    if (line10Adjustment > 0) {
      fillCurrencyField(
        form,
        line10Adjustment,
        "topmostSubform[0].Page1[0].f1_28[0]",
        "topmostSubform[0].Page1[0].f1_29[0]",
      )
    }

    /** 11 - Credit reduction (if applicable) */
    if (creditReduction > 0) {
      fillCurrencyField(
        form,
        creditReduction,
        "topmostSubform[0].Page1[0].f1_30[0]",
        "topmostSubform[0].Page1[0].f1_31[0]",
      )
    }

    /** Part 4 */
    /** 12 */
    fillCurrencyField(
      form,
      TotalFUTATaxAfterAdjustments,
      "topmostSubform[0].Page1[0].f1_32[0]",
      "topmostSubform[0].Page1[0].f1_33[0]",
    )
    /** 13 */
    fillCurrencyField(
      form,
      FUTATaxDespositedForYear,
      "topmostSubform[0].Page1[0].f1_34[0]",
      "topmostSubform[0].Page1[0].f1_35[0]",
    )

    /** 14 */
    fillCurrencyField(
      form,
      BalanceDue,
      "topmostSubform[0].Page1[0].f1_36[0]",
      "topmostSubform[0].Page1[0].f1_37[0]",
    )
    /** 15a */
    fillCurrencyField(
      form,
      overpayment,
      "topmostSubform[0].Page1[0].f1_48[0]",
      "topmostSubform[0].Page1[0].f1_49[0]",
    )
    /** 15b */
    form.getCheckBox("topmostSubform[0].Page1[0].c1_2[1]").check()
    /** Page 2 */

    /** Part 5 - Report your FUTA tax liability by quarter only if line 12 > $500 */
    if (TotalFUTATaxAfterAdjustments > 500 && quarterlyLiability) {
      /** 16a - Q1 liability */
      fillCurrencyField(
        form,
        FUTATaxLiabilityQuarter1,
        "topmostSubform[0].Page2[0].f2_1[0]",
        "topmostSubform[0].Page2[0].f2_2[0]",
      )
      /** 16b - Q2 liability */
      fillCurrencyField(
        form,
        FUTATaxLiabilityQuarter2,
        "topmostSubform[0].Page2[0].f2_3[0]",
        "topmostSubform[0].Page2[0].f2_4[0]",
      )
      /** 16c - Q3 liability */
      fillCurrencyField(
        form,
        FUTATaxLiabilityQuarter3,
        "topmostSubform[0].Page2[0].f2_5[0]",
        "topmostSubform[0].Page2[0].f2_6[0]",
      )
      /** 16d - Q4 liability */
      fillCurrencyField(
        form,
        FUTATaxLiabilityQuarter4,
        "topmostSubform[0].Page2[0].f2_7[0]",
        "topmostSubform[0].Page2[0].f2_8[0]",
      )
      /** 17 - Total must equal line 12 */
      fillCurrencyField(
        form,
        TotalFUTAXTaxLiability,
        "topmostSubform[0].Page2[0].f2_9[0]",
        "topmostSubform[0].Page2[0].f2_10[0]",
      )
    }
    /** Part 6 */
    form.getCheckBox("topmostSubform[0].Page2[0].c2_1[1]").check()
    /** Page 3 940-V*/
    fillCurrencyField(
      form,
      BalanceDue,
      "topmostSubform[0].Page3[0].f3_1[0]",
      "topmostSubform[0].Page3[0].f3_2[0]",
    )

    /** Page 4 Schedule A - Required for CA (credit reduction state) */
    if (form940.isSubjectToCreditReduction && stateAbbrev === "CA") {
      // Check CA box
      form
        .getCheckBox(
          "topmostSubform[0].Page1[0].Column1[0].BodyRow5[0].CAPostal[0].c1_5[0]",
        )
        .check()

      // FUTA taxable wages for CA
      fillCurrencyField(
        form,
        totalTaxableFUTAWages,
        "topmostSubform[0].Page1[0].Column1[0].BodyRow5[0].CAFUTA[0].f1_27[0]",
        "topmostSubform[0].Page1[0].Column1[0].BodyRow5[0].CAFUTA[0].f1_28[0]",
      )

      // Credit reduction rate
      const reductionRatePercent = (
        CA_FUTA_CREDIT_REDUCTION_RATE * 100
      ).toFixed(1)
      form
        .getTextField(
          "topmostSubform[0].Page1[0].Column1[0].BodyRow5[0].CA_ReductionRate[0]",
        )
        .setText(reductionRatePercent)

      // Credit reduction amount
      fillCurrencyField(
        form,
        creditReduction,
        "topmostSubform[0].Page1[0].Column1[0].BodyRow5[0].CAReduction[0].f1_29[0]",
        "topmostSubform[0].Page1[0].Column1[0].BodyRow5[0].CAReduction[0].f1_30[0]",
      )

      // Total credit reduction
      fillCurrencyField(
        form,
        creditReduction,
        "topmostSubform[0].Page1[0].f1_223[0]",
        "topmostSubform[0].Page1[0].f1_224[0]",
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
