import dbConnect from "@/lib/db/dbConnect"
import type {
  EmploymentStatus,
  PayFrequency,
  PayMethod,
  PayType,
} from "@/lib/constants/employment-constants"
import Company from "@/models/company"
import Employee from "@/models/employee"
import type { ICompensation } from "@/models/employee"
import Payroll from "@/models/payroll"
import { parseDateParam, getYearDateRange } from "@/lib/date/utils"

import { calculatePayrollForEmployee, calculateHours, calculateGrossPay, calculatePayrollTaxesCore } from "@/lib/payroll"
import type { PayrollTableData, YTDData } from "@/types/payroll"

interface EmployeeStub {
  _id: string
  firstName: string
  lastName: string
  currentSalary: number
  payType: PayType
  currentPayMethod: PayMethod
  employmentStatus: EmploymentStatus
  currentWorkingHours: number
  hireDate: Date
  terminationDate?: Date
  compensationHistory: ICompensation[]
}

interface PayrollRecordFromDB {
  _id: string
  employeeId: string
  employeeInfo: { firstName: string; lastName: string }
  hoursWorked?: { totalHours: number }
  compensation: { payType: string; payRate: number }
  earnings: {
    regularPay: number
    overtimePay: number
    commissionPay: number
    otherPay: number
    totalGrossPay: number
  }
  deductions: {
    preTax: { total: number }
    taxes: {
      federalIncomeTax: number
      socialSecurityTax: number
      medicareTax: number
      stateIncomeTax: number
      sdi: number
    }
    postTax: { total: number }
  }
  employerTaxes: {
    socialSecurityTax: number
    medicareTax: number
    futa: number
    sui: number
    ett: number
  }
  netPay: number
  approvalStatus: string
}
/**
 * Core business logic for fetching payroll table data.
 * Framework-agnostic — portable to any Node.js backend.
 */
export async function getPayrollTableDataCore(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<PayrollTableData[]> {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id payFrequency")
  if (!company) {
    throw new Error("Company not found.")
  }

  const payType: PayFrequency = company.payFrequency

  const startDateParsed = parseDateParam(startDate)
  const endDateParsed = parseDateParam(endDate)

  if (!startDateParsed || !endDateParsed) {
    throw new Error("Invalid date format. Expected MM-DD-YYYY.")
  }

  // Eligible: hired on or before period end, not terminated before period start
  const employees = await Employee.find(
    {
      companyId: company._id,
      hireDate: { $lte: endDateParsed },
      $or: [
        { terminationDate: { $exists: false } },
        { terminationDate: null },
        { terminationDate: { $gte: startDateParsed } },
      ],
    },
    {
      _id: 1,
      firstName: 1,
      lastName: 1,
      currentSalary: 1,
      payType: 1,
      currentPayMethod: 1,
      employmentStatus: 1,
      currentWorkingHours: 1,
      hireDate: 1,
      terminationDate: 1,
      compensationHistory: 1,
    },
  ).lean<EmployeeStub[]>()

  // Find existing payroll records for this exact pay period
  const payrollRecords = await Payroll.find({
    companyId: company._id,
    "payPeriod.startDate": startDateParsed,
    "payPeriod.endDate": endDateParsed,
  })
    .select(
      "employeeId employeeInfo.firstName employeeInfo.lastName hoursWorked.totalHours compensation.payType compensation.payRate earnings.totalGrossPay approvalStatus",
    )
    .lean<PayrollRecordFromDB[]>()

  const payrollRecordsMap = new Map<string, PayrollRecordFromDB>()
  payrollRecords.forEach((record: PayrollRecordFromDB) => {
    payrollRecordsMap.set(record.employeeId.toString(), record)
  })

  const tableData: PayrollTableData[] = employees.map((emp) => {
    const empId = emp._id.toString()
    const existingRecord = payrollRecordsMap.get(empId)

    if (existingRecord) {
      return {
        id: existingRecord.employeeId.toString(),
        payrollRecordId: existingRecord._id.toString(),
        name: `${existingRecord.employeeInfo.firstName} ${existingRecord.employeeInfo.lastName}`,
        regularPay: existingRecord.compensation.payRate,
        hours: existingRecord.hoursWorked?.totalHours || 0,
        grossPay: existingRecord.earnings.totalGrossPay,
        payType: existingRecord.compensation.payType,
        status: existingRecord.approvalStatus,
      }
    } else {
      // Find effective compensation at period end
      const history = emp.compensationHistory || []
      const sorted = [...history].sort(
        (a, b) =>
          new Date(b.effectiveDate).getTime() -
          new Date(a.effectiveDate).getTime(),
      )
      const effective = sorted.find((r) => {
        const eff = new Date(r.effectiveDate)
        const end = r.endDate ? new Date(r.endDate) : null
        return eff <= endDateParsed && (end === null || end >= endDateParsed)
      })

      const salary = effective?.salary ?? emp.currentSalary
      const empPayType = effective?.payType ?? emp.payType
      const workingHours =
        effective?.workingHours ?? emp.currentWorkingHours ?? 40

      const payrollData = calculatePayrollForEmployee({
        employeeId: empId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        currentSalary: salary,
        payType: empPayType,
        periodType: payType,
        startDate: startDate,
        endDate: endDate,
        weeklyHours: workingHours,
      })

      return {
        ...payrollData,
        status: "-" as const,
      }
    }
  })

  return tableData
}

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

/**
 * Calculates YTD totals for an employee up to (but not including) the given pay period.
 * Only includes approved payroll records from Jan 1 of the pay period's year.
 */
export async function getPayrollYTDCore(
  userId: string,
  employeeId: string,
  startDate: string,
): Promise<YTDData> {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id")
  if (!company) {
    throw new Error("Company not found.")
  }

  const employee = await Employee.findOne({
    _id: employeeId,
    companyId: company._id,
  }).select("_id")
  if (!employee) {
    throw new Error("Employee not found.")
  }

  const startDateObj = parseDateParam(startDate)
  if (!startDateObj) {
    throw new Error("Invalid date format. Expected MM-DD-YYYY.")
  }

  // YTD: Jan 1 of the pay period's year through (but not including) this period
  const { start: yearStart } = getYearDateRange(startDateObj.getFullYear())

  const payrollRecords = await Payroll.find({
    companyId: company._id,
    employeeId,
    "payPeriod.startDate": {
      $gte: yearStart,
      $lt: startDateObj,
    },
    approvalStatus: "approved",
  })
    .select(
      "earnings deductions.preTax.total deductions.taxes deductions.postTax.total employerTaxes netPay",
    )
    .lean<PayrollRecordFromDB[]>()

  const zero: YTDData = {
    salary: {
      regularPay: 0,
      overtimePay: 0,
      commissionPay: 0,
      otherPay: 0,
      totalGrossPay: 0,
    },
    totalFederalTax: 0,
    totalStateTax: 0,
    totalSocialSecurity: 0,
    totalMedicare: 0,
    totalSDI: 0,
    totalDeductions: 0,
    totalNetPay: 0,
    employerTotalFUTA: 0,
    employerTotalSocialSecurity: 0,
    employerTotalMedicare: 0,
    employerTotalCAETT: 0,
    employerTotalCASUI: 0,
    employerTotal: 0,
  }

  if (!payrollRecords || payrollRecords.length === 0) {
    return zero
  }

  const ytd = payrollRecords.reduce((acc, record) => {
    acc.salary.regularPay += record.earnings.regularPay
    acc.salary.overtimePay += record.earnings.overtimePay
    acc.salary.commissionPay += record.earnings.commissionPay
    acc.salary.otherPay += record.earnings.otherPay
    acc.salary.totalGrossPay += record.earnings.totalGrossPay

    acc.totalFederalTax += record.deductions.taxes.federalIncomeTax
    acc.totalStateTax += record.deductions.taxes.stateIncomeTax
    acc.totalSocialSecurity += record.deductions.taxes.socialSecurityTax
    acc.totalMedicare += record.deductions.taxes.medicareTax
    acc.totalSDI += record.deductions.taxes.sdi
    acc.totalDeductions +=
      record.deductions.preTax.total + record.deductions.postTax.total
    acc.totalNetPay += record.netPay

    acc.employerTotalFUTA += record.employerTaxes.futa
    acc.employerTotalSocialSecurity += record.employerTaxes.socialSecurityTax
    acc.employerTotalMedicare += record.employerTaxes.medicareTax
    acc.employerTotalCAETT += record.employerTaxes.ett
    acc.employerTotalCASUI += record.employerTaxes.sui

    return acc
  }, zero)

  ytd.employerTotal =
    ytd.employerTotalFUTA +
    ytd.employerTotalSocialSecurity +
    ytd.employerTotalMedicare +
    ytd.employerTotalCAETT +
    ytd.employerTotalCASUI

  return ytd
}

