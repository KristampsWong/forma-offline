import dbConnect from "@/lib/db/dbConnect"
import Company from "@/models/company"
import Employee from "@/models/employee"
import Payroll from "@/models/payroll"
import { parseDateParam } from "@/lib/date/utils"
import {
  calculateHours,
  calculateGrossPay,
  calculatePayrollTaxesCore,
} from "@/lib/payroll"
import { getPayrollYTDCore } from "@/lib/services/payroll/reporting"

export async function createPayrollRecordCore(
  userId: string,
  employeeId: string,
  startDate: string,
  endDate: string,
  payDate: string,
  hours?: number,
): Promise<{ payrollId: string; employeeId: string }> {
  await dbConnect()

  // 1. Look up company by userId (service layer pattern)
  const company = await Company.findOne({ userId })
  if (!company) {
    throw new Error("Company not found.")
  }

  if (!company.currentStateRate) {
    throw new Error("Company is missing state tax rates.")
  }

  // 2. Find the employee
  const employee = await Employee.findOne({
    _id: employeeId,
    companyId: company._id,
  })
  if (!employee) {
    throw new Error("Employee not found.")
  }

  // 3. Parse and validate dates (MM-DD-YYYY from URL params)
  const startDateObj = parseDateParam(startDate)
  const endDateObj = parseDateParam(endDate)
  const payDateObj = parseDateParam(payDate)

  if (!startDateObj || !endDateObj || !payDateObj) {
    throw new Error("Invalid date format. Expected MM-DD-YYYY.")
  }

  if (payDateObj < endDateObj) {
    throw new Error("Pay date cannot be before period end date.")
  }

  // 4. Check for existing exact match payroll record
  const exactMatch = await Payroll.findOne({
    companyId: company._id,
    employeeId: employee._id,
    "payPeriod.startDate": startDateObj,
    "payPeriod.endDate": endDateObj,
  })

  if (exactMatch) {
    exactMatch.payPeriod.payDate = payDateObj
    await exactMatch.save()
    return {
      payrollId: exactMatch._id.toString(),
      employeeId: employeeId,
    }
  }

  // 5. Check for overlapping periods
  const overlapping = await Payroll.findOne({
    companyId: company._id,
    employeeId: employee._id,
    "payPeriod.startDate": { $lte: endDateObj },
    "payPeriod.endDate": { $gte: startDateObj },
  })

  if (overlapping) {
    throw new Error("Pay period overlaps with an existing record.")
  }

  // 6. Calculate hours and gross pay
  const payFrequency = company.payFrequency
  const { salary, payType, workingHours } = employee.currentCompensation

  const totalHours =
    hours !== undefined
      ? hours
      : calculateHours(workingHours, {
          type: payFrequency,
          startDate: startDateObj,
          endDate: endDateObj,
        })

  const grossPay = calculateGrossPay(salary, totalHours)

  // 7. Calculate YTD and taxes
  const ytdResult = await getPayrollYTDCore(userId, employeeId, startDate)
  const taxResult = calculatePayrollTaxesCore({
    grossPay,
    periodType: payFrequency,
    ytdGrossPay: ytdResult.salary.totalGrossPay,
    federalW4: employee.currentFederalW4,
    stateTax: employee.currentStateTax,
    companyRates: company.currentStateRate,
    taxExemptions: employee.taxExemptions,
  })

  // 8. Create payroll record with denormalized snapshots
  const payrollRecord = new Payroll({
    companyId: company._id,
    employeeId: employee._id,
    employeeInfo: {
      firstName: employee.firstName,
      lastName: employee.lastName,
      middleName: employee.middleName,
      ssn: employee.ssn,
      email: employee.email,
    },
    payPeriod: {
      periodType: payFrequency,
      startDate: startDateObj,
      endDate: endDateObj,
      payDate: payDateObj,
    },
    hoursWorked: {
      regularHours: totalHours,
      overtimeHours: 0,
      doubleTimeHours: 0,
      sickHours: 0,
      vacationHours: 0,
      holidayHours: 0,
      totalHours: totalHours,
    },
    compensation: {
      payType: payType,
      payRate: salary,
      workingHours: workingHours,
    },
    payMethod: employee.currentPayMethod.payMethod,
    federalW4: employee.currentFederalW4
      ? {
          formVersion: employee.currentFederalW4.formVersion,
          filingStatus: employee.currentFederalW4.filingStatus,
          multipleJobsOrSpouseWorks:
            employee.currentFederalW4.multipleJobsOrSpouseWorks,
          claimedDependentsDeduction:
            employee.currentFederalW4.claimedDependentsDeduction,
          otherIncome: employee.currentFederalW4.otherIncome,
          deductions: employee.currentFederalW4.deductions,
          extraWithholding: employee.currentFederalW4.extraWithholding,
          effectiveDate: employee.currentFederalW4.effectiveDate,
        }
      : undefined,
    californiaDE4: employee.currentStateTax?.californiaDE4
      ? {
          filingStatus: employee.currentStateTax.californiaDE4.filingStatus,
          worksheetA: employee.currentStateTax.californiaDE4.worksheetA,
          worksheetB: employee.currentStateTax.californiaDE4.worksheetB,
          additionalWithholding:
            employee.currentStateTax.californiaDE4.additionalWithholding,
          exempt: employee.currentStateTax.californiaDE4.exempt,
          wagesPlanCode: employee.currentStateTax.californiaDE4.wagesPlanCode,
          effectiveDate: employee.currentStateTax.californiaDE4.effectiveDate,
        }
      : undefined,
    taxExemptions: {
      futa: employee.taxExemptions?.futa || false,
      fica: employee.taxExemptions?.fica || false,
      suiEtt: employee.taxExemptions?.suiEtt || false,
      sdi: employee.taxExemptions?.sdi || false,
    },
    earnings: {
      regularPay: grossPay,
      overtimePay: 0,
      bonusPay: 0,
      commissionPay: 0,
      otherPay: 0,
      totalGrossPay: grossPay,
    },
    deductions: {
      preTax: {
        retirement401k: 0,
        healthInsurance: 0,
        dentalInsurance: 0,
        visionInsurance: 0,
        hsaFsa: 0,
        other: 0,
        total: 0,
      },
      taxes: taxResult.employeeTaxes,
      postTax: {
        garnishments: 0,
        unionDues: 0,
        charitableDonations: 0,
        other: 0,
        total: 0,
      },
    },
    employerTaxes: taxResult.employerTaxes,
    netPay: taxResult.netPay,
    approvalStatus: "pending",
  })

  await payrollRecord.save()

  return {
    payrollId: payrollRecord._id.toString(),
    employeeId: employee._id.toString(),
  }
}
