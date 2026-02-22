import fs from "node:fs"
import { type NextRequest, NextResponse } from "next/server"
import { PDFDocument } from "pdf-lib"
import { getEmployeeWithHolding } from "@/actions/employee"
import { getPdfFormPath } from "@/lib/constants/pdf-forms"
import { logger } from "@/lib/logger"

export async function GET(req: NextRequest) {
  try {
    const employeeId = req.nextUrl.searchParams.get("employeeId")

    if (!employeeId) {
      return NextResponse.json(
        { message: "Employee ID is required." },
        { status: 400 },
      )
    }

    const result = await getEmployeeWithHolding(employeeId)

    if (!result.success) {
      return NextResponse.json(
        { message: result.error },
        { status: 404 },
      )
    }

    const { employee, federalW4, employer } = result

    const middleInitial = employee.middleName
      ? ` ${employee.middleName.charAt(0)}.`
      : ""
    const firstAndMiddleName = `${employee.firstName}${middleInitial}`
    const lastName = employee.lastName
    const employeeAddress = employee.address
    const addressStreet1 = [employeeAddress.street1, employeeAddress.street2]
      .filter(Boolean)
      .join(" ")

    const pdfPath = getPdfFormPath("W4", new Date().getFullYear())
    const formPdfBytes = fs.readFileSync(pdfPath)

    const pdfDoc = await PDFDocument.load(formPdfBytes)
    const form = pdfDoc.getForm()

    form
      .getTextField("topmostSubform[0].Page1[0].Step1a[0].f1_01[0]")
      .setText(firstAndMiddleName)
    form
      .getTextField("topmostSubform[0].Page1[0].Step1a[0].f1_02[0]")
      .setText(lastName)
    form
      .getTextField("topmostSubform[0].Page1[0].f1_05[0]")
      .setText(employee.ssnDecrypted || "")
    form
      .getTextField("topmostSubform[0].Page1[0].Step1a[0].f1_03[0]")
      .setText(addressStreet1)
    form
      .getTextField("topmostSubform[0].Page1[0].Step1a[0].f1_04[0]")
      .setText(
        `${employeeAddress.city}, ${employeeAddress.state} ${employeeAddress.zipCode}`,
      )

    switch (federalW4.filingStatus) {
      case "single_or_married_separately":
        form.getCheckBox("topmostSubform[0].Page1[0].c1_1[0]").check()
        break
      case "married_jointly_or_qualifying_surviving":
        form.getCheckBox("topmostSubform[0].Page1[0].c1_1[1]").check()
        break
      case "head_of_household":
        form.getCheckBox("topmostSubform[0].Page1[0].c1_1[2]").check()
        break
    }
    if (federalW4.multipleJobsOrSpouseWorks) {
      form.getCheckBox("topmostSubform[0].Page1[0].c1_2[0]").check()
    }

    /** step 3 */
    form
      .getTextField("topmostSubform[0].Page1[0].f1_09[0]")
      .setText(
        federalW4.claimedDependentsDeduction
          ? federalW4.claimedDependentsDeduction.toString()
          : "0",
      )

    /** step 4 */
    const otherIncome = federalW4.otherIncome
      ? federalW4.otherIncome.toString()
      : "0"
    const deductions = federalW4.deductions
      ? federalW4.deductions.toString()
      : "0"
    const extraWithholding = federalW4.extraWithholding
      ? federalW4.extraWithholding.toString()
      : "0"

    form
      .getTextField("topmostSubform[0].Page1[0].f1_10[0]")
      .setText(otherIncome)
    form.getTextField("topmostSubform[0].Page1[0].f1_11[0]").setText(deductions)
    form
      .getTextField("topmostSubform[0].Page1[0].f1_12[0]")
      .setText(extraWithholding)

    /** employer section */
    const companyAddress = employer.address.line2
      ? `${employer.address.line1}, ${employer.address.line2}`
      : employer.address.line1
    form
      .getTextField("topmostSubform[0].Page1[0].f1_13[0]")
      .setText(
        `${employer.name}, ${companyAddress}, ${employer.address.city}, ${employer.address.state}, ${employer.address.zip}`,
      )
    form
      .getTextField("topmostSubform[0].Page1[0].f1_14[0]")
      .setText(employee.hireDate.split("T")[0] || "")
    form
      .getTextField("topmostSubform[0].Page1[0].f1_15[0]")
      .setText(employer.ein)

    form.flatten()
    const pdfBytes = await pdfDoc.save()
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="filled_fw4_${new Date().getFullYear()}.pdf"`,
      },
    })
  } catch (err) {
    logger.error("Error generating W-4 PDF:", err)
    return NextResponse.json(
      { message: "Error generating PDF." },
      { status: 500 },
    )
  }
}
