import fs from "node:fs"
import { type NextRequest, NextResponse } from "next/server"
import { PDFDocument, type PDFForm } from "pdf-lib"
import { getForm941FilingById } from "@/actions/taxes"
import { getPdfFormPath } from "@/lib/constants/pdf-forms"
import { logger } from "@/lib/logger"

export async function GET(req: NextRequest) {
  const form941Id = req.nextUrl.searchParams.get("id")

  if (!form941Id) {
    return NextResponse.json(
      { message: "Form 941 ID is required." },
      { status: 400 },
    )
  }

  try {
    const result = await getForm941FilingById(form941Id)

    if (!result.success) {
      return NextResponse.json(
        { message: result.error },
        { status: 404 },
      )
    }

    const { form941, company } = result.data

    // Extract quarter number from "Q1", "Q2", etc.
    const quarterNumber = form941.quarter.replace("Q", "")

    const pdfPath = getPdfFormPath("941", form941.year)
    const formPdfBytes = fs.readFileSync(pdfPath)

    const pdfDoc = await PDFDocument.load(formPdfBytes)
    const form = pdfDoc.getForm()

    // Company information
    const companyName = company.name
    const ein = company.ein.replace("-", "")
    const { line1, line2, city, state, zip } = company.address
    const address = line2 ? `${line1}, ${line2}` : line1

    // Form 941 data
    const numberOfEmployees = form941.numberOfEmployees
    const wage = form941.totalWages
    const federalIncomeTaxWithheld = form941.federalIncomeTaxWithheld

    // Line 5a - Social Security
    const socialSecurityWages = form941.line5a_socialSecurityWages
    const socialSecurityTax = form941.line5a_socialSecurityTax

    // Line 5b - Social Security Tips
    const socialSecurityTips = form941.line5b_socialSecurityTips
    const socialSecurityTipsTax = form941.line5b_socialSecurityTipsTax

    // Line 5c - Medicare
    const medicareWages = form941.line5c_medicareWagesTips
    const medicareTax = form941.line5c_medicareTax

    // Line 5d - Additional Medicare Tax
    const additionalMedicareWages =
      form941.line5d_medicareWagesTipsSubjectToAdditional
    const additionalMedicareTax = form941.line5d_additionalMedicareTax

    // Line 5e - Total Social Security and Medicare tax
    const totalSocialAndMedicare = form941.line5e_totalSocialSecurityMedicareTax

    // Line 6 - Total taxes before adjustments
    const totalTaxBeforeAdjustments = form941.totalTaxesBeforeAdjustments

    // Line 7 - Current quarter adjustments
    const currentQuarterAdjustments = form941.currentQuarterAdjustments

    // Line 10 - Total taxes after adjustments
    const totalTaxesAfterAdjustments =
      totalTaxBeforeAdjustments + currentQuarterAdjustments

    // Line 12 - Total taxes after adjustments and credits
    const totalTaxesAfterAdjustmentsAndCredits =
      form941.totalTaxesAfterAdjustmentsAndCredits

    // Line 13 - Total deposits
    const totalDeposits = form941.totalDepositsForQuarter

    // Line 14 - Balance due
    const balanceDue = form941.balanceDue

    // Line 15 - Overpayment
    const overpayment = form941.overpayment

    // ===== Fill PDF Form =====

    // EIN fields (Page 1)
    const einFields = [
      "topmostSubform[0].Page1[0].Header[0].EntityArea[0].f1_1[0]",
      "topmostSubform[0].Page1[0].Header[0].EntityArea[0].f1_2[0]",
    ]

    const parts = [ein.slice(0, 2), ein.slice(2)]
    parts.forEach((val, i) => {
      form.getTextField(einFields[i]).setText(val)
    })

    // Company name
    form
      .getTextField(
        "topmostSubform[0].Page1[0].Header[0].EntityArea[0].f1_3[0]",
      )
      .setText(companyName)

    // Address
    form
      .getTextField(
        "topmostSubform[0].Page1[0].Header[0].EntityArea[0].f1_5[0]",
      )
      .setText(address)

    // City
    form
      .getTextField(
        "topmostSubform[0].Page1[0].Header[0].EntityArea[0].f1_6[0]",
      )
      .setText(city)

    // State
    form
      .getTextField(
        "topmostSubform[0].Page1[0].Header[0].EntityArea[0].f1_7[0]",
      )
      .setText(state)

    // Zip Code
    form
      .getTextField(
        "topmostSubform[0].Page1[0].Header[0].EntityArea[0].f1_8[0]",
      )
      .setText(zip)

    // Quarter checkbox
    const quarterCheckBox = form.getCheckBox(
      `topmostSubform[0].Page1[0].Header[0].ReportForQuarter[0].c1_1[${
        parseInt(quarterNumber, 10) - 1
      }]`,
    )
    quarterCheckBox.check()

    // Line 1 - Number of employees
    form
      .getTextField("topmostSubform[0].Page1[0].f1_12[0]")
      .setText(numberOfEmployees.toString())

    // Line 2 - Total wages
    fillCurrencyField(
      form,
      wage,
      "topmostSubform[0].Page1[0].f1_13[0]",
      "topmostSubform[0].Page1[0].f1_14[0]",
    )

    // Line 3 - Federal income tax withheld
    fillCurrencyField(
      form,
      federalIncomeTaxWithheld,
      "topmostSubform[0].Page1[0].f1_15[0]",
      "topmostSubform[0].Page1[0].f1_16[0]",
    )

    // Line 5a - Social Security wages and tax
    fillCurrencyField(
      form,
      socialSecurityWages,
      "topmostSubform[0].Page1[0].f1_17[0]",
      "topmostSubform[0].Page1[0].f1_18[0]",
    )
    fillCurrencyField(
      form,
      socialSecurityTax,
      "topmostSubform[0].Page1[0].f1_19[0]",
      "topmostSubform[0].Page1[0].f1_20[0]",
    )

    // Line 5b - Social Security tips (if any)
    if (socialSecurityTips > 0) {
      fillCurrencyField(
        form,
        socialSecurityTips,
        "topmostSubform[0].Page1[0].f1_21[0]",
        "topmostSubform[0].Page1[0].f1_22[0]",
      )
      fillCurrencyField(
        form,
        socialSecurityTipsTax,
        "topmostSubform[0].Page1[0].f1_23[0]",
        "topmostSubform[0].Page1[0].f1_24[0]",
      )
    }

    // Line 5c - Medicare wages and tax
    fillCurrencyField(
      form,
      medicareWages,
      "topmostSubform[0].Page1[0].f1_25[0]",
      "topmostSubform[0].Page1[0].f1_26[0]",
    )
    fillCurrencyField(
      form,
      medicareTax,
      "topmostSubform[0].Page1[0].f1_27[0]",
      "topmostSubform[0].Page1[0].f1_28[0]",
    )

    // Line 5d - Additional Medicare Tax (if any)
    if (additionalMedicareWages > 0) {
      fillCurrencyField(
        form,
        additionalMedicareWages,
        "topmostSubform[0].Page1[0].f1_29[0]",
        "topmostSubform[0].Page1[0].f1_30[0]",
      )
      fillCurrencyField(
        form,
        additionalMedicareTax,
        "topmostSubform[0].Page1[0].f1_31[0]",
        "topmostSubform[0].Page1[0].f1_32[0]",
      )
    }

    // Line 5e - Total Social Security and Medicare tax
    fillCurrencyField(
      form,
      totalSocialAndMedicare,
      "topmostSubform[0].Page1[0].f1_33[0]",
      "topmostSubform[0].Page1[0].f1_34[0]",
    )

    // Line 6 - Total taxes before adjustments
    fillCurrencyField(
      form,
      totalTaxBeforeAdjustments,
      "topmostSubform[0].Page1[0].f1_37[0]",
      "topmostSubform[0].Page1[0].f1_38[0]",
    )

    // Line 7 - Current quarter adjustments
    if (currentQuarterAdjustments !== 0) {
      fillCurrencyField(
        form,
        currentQuarterAdjustments,
        "topmostSubform[0].Page1[0].f1_39[0]",
        "topmostSubform[0].Page1[0].f1_40[0]",
      )
    }

    // Line 10 - Total taxes after adjustments
    fillCurrencyField(
      form,
      totalTaxesAfterAdjustments,
      "topmostSubform[0].Page1[0].f1_45[0]",
      "topmostSubform[0].Page1[0].f1_46[0]",
    )

    // Line 12 - Total taxes after adjustments and credits
    fillCurrencyField(
      form,
      totalTaxesAfterAdjustmentsAndCredits,
      "topmostSubform[0].Page1[0].f1_49[0]",
      "topmostSubform[0].Page1[0].f1_50[0]",
    )

    // Line 13 - Total deposits
    if (totalDeposits > 0) {
      fillCurrencyField(
        form,
        totalDeposits,
        "topmostSubform[0].Page1[0].f1_51[0]",
        "topmostSubform[0].Page1[0].f1_52[0]",
      )
    }

    // Line 14 - Balance due
    if (balanceDue > 0) {
      fillCurrencyField(
        form,
        balanceDue,
        "topmostSubform[0].Page1[0].f1_53[0]",
        "topmostSubform[0].Page1[0].f1_54[0]",
      )
    }

    // Line 15 - Overpayment
    if (overpayment > 0) {
      fillCurrencyField(
        form,
        overpayment,
        "topmostSubform[0].Page1[0].f1_55[0]",
        "topmostSubform[0].Page1[0].f1_56[0]",
      )
      form.getCheckBox("topmostSubform[0].Page1[0].c1_3[1]").check()
    }

    // ===== Page 2 =====
    form
      .getTextField("topmostSubform[0].Page2[0].Name_ReadOrder[0].f1_3[0]")
      .setText(companyName)

    const einFieldsPage2 = [
      "topmostSubform[0].Page2[0].EIN_Number[0].f1_1[0]",
      "topmostSubform[0].Page2[0].EIN_Number[0].f1_2[0]",
    ]

    const EINparts = [ein.slice(0, 2), ein.slice(2)]
    EINparts.forEach((val, i) => {
      form.getTextField(einFieldsPage2[i]).setText(val)
    })

    // ===== Line 16: Monthly Summary of Federal Tax Liability =====

    // Determine which option to check based on database fields
    const isSmallLiability =
      !form941.isSemiweeklyScheduleDepositor &&
      !form941.monthlyTaxLiability &&
      !form941.scheduleB

    const isMonthlyDepositor =
      !form941.isSemiweeklyScheduleDepositor && form941.monthlyTaxLiability
    const isSemiweeklyDepositor = form941.isSemiweeklyScheduleDepositor

    // Option 1: Small liability (de minimis)
    if (isSmallLiability) {
      form.getCheckBox("topmostSubform[0].Page2[0].c2_1[0]").check()
    }

    // Option 2: Monthly depositor
    if (isMonthlyDepositor && form941.monthlyTaxLiability) {
      form.getCheckBox("topmostSubform[0].Page2[0].c2_1[1]").check()

      // Fill monthly tax liability breakdown
      fillCurrencyField(
        form,
        form941.monthlyTaxLiability.month1,
        "topmostSubform[0].Page2[0].f2_1[0]",
        "topmostSubform[0].Page2[0].f2_2[0]",
      )
      fillCurrencyField(
        form,
        form941.monthlyTaxLiability.month2,
        "topmostSubform[0].Page2[0].f2_3[0]",
        "topmostSubform[0].Page2[0].f2_4[0]",
      )
      fillCurrencyField(
        form,
        form941.monthlyTaxLiability.month3,
        "topmostSubform[0].Page2[0].f2_5[0]",
        "topmostSubform[0].Page2[0].f2_6[0]",
      )
      fillCurrencyField(
        form,
        form941.monthlyTaxLiability.total,
        "topmostSubform[0].Page2[0].f2_7[0]",
        "topmostSubform[0].Page2[0].f2_8[0]",
      )
    }

    // Option 3: Semiweekly depositor
    if (isSemiweeklyDepositor) {
      form.getCheckBox("topmostSubform[0].Page2[0].c2_1[2]").check()
    }

    /** Part 4 */
    form.getCheckBox("topmostSubform[0].Page2[0].c2_4[1]").check()

    // ===== Page 3 (Payment Voucher) =====
    const einFieldsPage3 = [
      "topmostSubform[0].Page3[0].EIN_Number[0].f1_1[0]",
      "topmostSubform[0].Page3[0].EIN_Number[0].f1_2[0]",
    ]

    const EINparts3 = [ein.slice(0, 2), ein.slice(2)]
    EINparts3.forEach((val, i) => {
      form.getTextField(einFieldsPage3[i]).setText(val)
    })

    // Quarter checkbox on payment voucher
    const quarterCheckBoxOn941V = form.getCheckBox(
      `topmostSubform[0].Page3[0].Line3_ReadOrder[0].c3_1[${
        parseInt(quarterNumber, 10) - 1
      }]`,
    )
    quarterCheckBoxOn941V.check()

    // Payment amount (balance due)
    if (balanceDue > 0) {
      fillCurrencyField(
        form,
        balanceDue,
        "topmostSubform[0].Page3[0].f3_1[0]",
        "topmostSubform[0].Page3[0].f3_2[0]",
      )
    }

    // Company name and address on payment voucher
    form.getTextField("topmostSubform[0].Page3[0].f1_3[0]").setText(companyName)
    form.getTextField("topmostSubform[0].Page3[0].f3_3[0]").setText(address)
    form
      .getTextField("topmostSubform[0].Page3[0].f3_4[0]")
      .setText(`${city}, ${state} ${zip}`)

    const pdfBytes = await pdfDoc.save()

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Form_941_${form941.quarter}_${form941.year}_${companyName}.pdf"`,
      },
    })
  } catch (err) {
    logger.error("Error generating Form 941 PDF:", err)
    return NextResponse.json(
      { message: "Error generating Form 941 PDF" },
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
