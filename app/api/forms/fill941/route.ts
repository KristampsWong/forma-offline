import fs from "node:fs"
import { type NextRequest, NextResponse } from "next/server"
import { PDFDocument, type PDFForm } from "pdf-lib"
import { getForm941FilingById } from "@/actions/taxes"
import {
  getEffectiveFormYear,
  getForm941Fields,
  getPdfFormPath,
} from "@/lib/constants/pdf-forms"
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

    // Every PDF field name comes from a version-specific map resolved by the
    // PDF revision year (not the raw tax year), so the names always match the
    // template actually loaded on disk.
    const effectiveYear = getEffectiveFormYear("941", form941.year)
    const fields = getForm941Fields(effectiveYear)

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
    // All field names come from the version-specific map (`fields`); this route
    // never hardcodes a field name.

    const einParts = [ein.slice(0, 2), ein.slice(2)]
    const quarterIndex = parseInt(quarterNumber, 10) - 1

    // Page 1 - Entity area
    form.getTextField(fields.einPart1).setText(einParts[0])
    form.getTextField(fields.einPart2).setText(einParts[1])
    form.getTextField(fields.companyName).setText(companyName)
    form.getTextField(fields.addressLine).setText(address)
    form.getTextField(fields.city).setText(city)
    form.getTextField(fields.state).setText(state)
    form.getTextField(fields.zip).setText(zip)

    // Quarter checkbox
    form.getCheckBox(`${fields.quarterCheckboxPrefix}[${quarterIndex}]`).check()

    // Line 1 - Number of employees
    form
      .getTextField(fields.line1NumEmployees)
      .setText(numberOfEmployees.toString())

    // Line 2 - Total wages
    fillCurrencyField(form, wage, fields.line2WagesInt, fields.line2WagesDec)

    // Line 3 - Federal income tax withheld
    fillCurrencyField(
      form,
      federalIncomeTaxWithheld,
      fields.line3FitwInt,
      fields.line3FitwDec,
    )

    // Line 5a - Social Security wages and tax
    fillCurrencyField(
      form,
      socialSecurityWages,
      fields.line5aSsWagesInt,
      fields.line5aSsWagesDec,
    )
    fillCurrencyField(
      form,
      socialSecurityTax,
      fields.line5aSsTaxInt,
      fields.line5aSsTaxDec,
    )

    // Line 5b - Social Security tips (if any)
    if (socialSecurityTips > 0) {
      fillCurrencyField(
        form,
        socialSecurityTips,
        fields.line5bSsTipsInt,
        fields.line5bSsTipsDec,
      )
      fillCurrencyField(
        form,
        socialSecurityTipsTax,
        fields.line5bSsTipsTaxInt,
        fields.line5bSsTipsTaxDec,
      )
    }

    // Line 5c - Medicare wages and tax
    fillCurrencyField(
      form,
      medicareWages,
      fields.line5cMedWagesInt,
      fields.line5cMedWagesDec,
    )
    fillCurrencyField(
      form,
      medicareTax,
      fields.line5cMedTaxInt,
      fields.line5cMedTaxDec,
    )

    // Line 5d - Additional Medicare Tax (if any)
    if (additionalMedicareWages > 0) {
      fillCurrencyField(
        form,
        additionalMedicareWages,
        fields.line5dAddlMedWagesInt,
        fields.line5dAddlMedWagesDec,
      )
      fillCurrencyField(
        form,
        additionalMedicareTax,
        fields.line5dAddlMedTaxInt,
        fields.line5dAddlMedTaxDec,
      )
    }

    // Line 5e - Total Social Security and Medicare tax
    fillCurrencyField(
      form,
      totalSocialAndMedicare,
      fields.line5eTotalInt,
      fields.line5eTotalDec,
    )

    // Line 6 - Total taxes before adjustments
    fillCurrencyField(
      form,
      totalTaxBeforeAdjustments,
      fields.line6Int,
      fields.line6Dec,
    )

    // Line 7 - Current quarter adjustments
    if (currentQuarterAdjustments !== 0) {
      fillCurrencyField(
        form,
        currentQuarterAdjustments,
        fields.line7Int,
        fields.line7Dec,
      )
    }

    // Line 10 - Total taxes after adjustments
    fillCurrencyField(
      form,
      totalTaxesAfterAdjustments,
      fields.line10Int,
      fields.line10Dec,
    )

    // Line 12 - Total taxes after adjustments and credits
    fillCurrencyField(
      form,
      totalTaxesAfterAdjustmentsAndCredits,
      fields.line12Int,
      fields.line12Dec,
    )

    // Line 13 - Total deposits
    if (totalDeposits > 0) {
      fillCurrencyField(form, totalDeposits, fields.line13Int, fields.line13Dec)
    }

    // Line 14 - Balance due
    if (balanceDue > 0) {
      fillCurrencyField(form, balanceDue, fields.line14Int, fields.line14Dec)
    }

    // Line 15 - Overpayment
    if (overpayment > 0) {
      fillCurrencyField(
        form,
        overpayment,
        fields.line15OverpaymentInt,
        fields.line15OverpaymentDec,
      )
      form.getCheckBox(fields.line15RefundCheckbox).check()
    }

    // ===== Page 2 =====
    form.getTextField(fields.page2CompanyName).setText(companyName)
    form.getTextField(fields.page2EinPart1).setText(einParts[0])
    form.getTextField(fields.page2EinPart2).setText(einParts[1])

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
      form.getCheckBox(fields.line16SmallLiabilityCheckbox).check()
    }

    // Option 2: Monthly depositor
    if (isMonthlyDepositor && form941.monthlyTaxLiability) {
      form.getCheckBox(fields.line16MonthlyCheckbox).check()

      // Fill monthly tax liability breakdown
      fillCurrencyField(
        form,
        form941.monthlyTaxLiability.month1,
        fields.line16Month1Int,
        fields.line16Month1Dec,
      )
      fillCurrencyField(
        form,
        form941.monthlyTaxLiability.month2,
        fields.line16Month2Int,
        fields.line16Month2Dec,
      )
      fillCurrencyField(
        form,
        form941.monthlyTaxLiability.month3,
        fields.line16Month3Int,
        fields.line16Month3Dec,
      )
      fillCurrencyField(
        form,
        form941.monthlyTaxLiability.total,
        fields.line16TotalInt,
        fields.line16TotalDec,
      )
    }

    // Option 3: Semiweekly depositor
    if (isSemiweeklyDepositor) {
      form.getCheckBox(fields.line16SemiweeklyCheckbox).check()
    }

    /** Part 4 */
    form.getCheckBox(fields.part4ThirdPartyNoCheckbox).check()

    // ===== Page 3 (Payment Voucher) =====
    form.getTextField(fields.voucherEinPart1).setText(einParts[0])
    form.getTextField(fields.voucherEinPart2).setText(einParts[1])

    // Quarter checkbox on payment voucher
    form
      .getCheckBox(`${fields.voucherQuarterCheckboxPrefix}[${quarterIndex}]`)
      .check()

    // Payment amount (balance due)
    if (balanceDue > 0) {
      fillCurrencyField(
        form,
        balanceDue,
        fields.voucherAmountInt,
        fields.voucherAmountDec,
      )
    }

    // Company name and address on payment voucher
    form.getTextField(fields.voucherCompanyName).setText(companyName)
    form.getTextField(fields.voucherAddress).setText(address)
    form
      .getTextField(fields.voucherCityStateZip)
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
