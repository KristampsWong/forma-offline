/**
 * Multi-record operations — 2 functions:
 *  1. batchCreatePayrollRecordsCore   ✅ implemented
 *  2. approvePayrollRecordsCore       ✅ implemented
 */
import dbConnect from "@/lib/db/dbConnect"
import Company from "@/models/company"
import Employee from "@/models/employee"
import Payroll from "@/models/payroll"
import { parseDateParam } from "@/lib/date/utils"
import {
  calculateHours,
  calculateGrossPay,
  calculatePayrollTaxesCore,
  RoundingToCents,
} from "@/lib/payroll"
import { getTaxRates } from "@/lib/constants/tax-rates"
import { COMPANY_ERRORS, PAYROLL_ERRORS } from "@/lib/constants/errors"
import { batchGetPayrollYTDCore } from "@/lib/services/payroll/reporting"
import { buildPayrollRecord } from "@/lib/services/payroll/builders"
import type { IEmployee } from "@/models/employee"
import type { LeanDoc } from "@/types/db"

/**
 * Batch create or update payroll records for all (or targeted) employees.
 * Service layer function — takes userId, handles company lookup internally.
 */
export async function batchCreatePayrollRecordsCore(
  userId: string,
  startDate: string,
  endDate: string,
  payDate: string,
  employeeHours?: Record<string, number>
): Promise<{
  createdCount: number
  updatedCount: number
  approvedCount: number
}> {
  await dbConnect()

  const company = await Company.findOne({ userId })
  if (!company) {
    throw new Error(COMPANY_ERRORS.NOT_FOUND)
  }

  if (!company.currentStateRate) {
    throw new Error(PAYROLL_ERRORS.MISSING_STATE_RATES)
  }

  // Parse dates (MM-DD-YYYY from URL params)
  const startDateObj = parseDateParam(startDate)
  const endDateObj = parseDateParam(endDate)
  const payDateObj = parseDateParam(payDate)

  if (!startDateObj || !endDateObj || !payDateObj) {
    throw new Error(PAYROLL_ERRORS.INVALID_DATE_FORMAT)
  }

  if (payDateObj < startDateObj) {
    throw new Error(PAYROLL_ERRORS.PAY_DATE_BEFORE_START)
  }

  const endDateForFilter = new Date(endDateObj)
  endDateForFilter.setUTCHours(23, 59, 59, 999)

  const allEmployees = await Employee.find({
    companyId: company._id,
  }).lean<LeanDoc<IEmployee>[]>()

  const targetEmployeeIds = employeeHours ? Object.keys(employeeHours) : null
  const employees = allEmployees.filter((emp) => {
    const hireDate = new Date(emp.hireDate)
    const isHiredBeforeEndDate = hireDate <= endDateForFilter
    if (targetEmployeeIds && targetEmployeeIds.length > 0) {
      return (
        isHiredBeforeEndDate && targetEmployeeIds.includes(emp._id.toString())
      )
    }
    return isHiredBeforeEndDate
  })

  if (!employees || employees.length === 0) {
    return {
      createdCount: 0,
      updatedCount: 0,
      approvedCount: 0,
    }
  }

  const existingPayrollRecords = await Payroll.find({
    companyId: company._id,
    $or: [
      {
        "payPeriod.startDate": startDateObj,
        "payPeriod.endDate": endDateObj,
      },
      {
        "payPeriod.startDate": { $lte: endDateObj },
        "payPeriod.endDate": { $gte: startDateObj },
      },
    ],
  })

  const pendingRecordsMap = new Map(
    existingPayrollRecords
      .filter((record) => record.approvalStatus === "pending")
      .map((record) => [record.employeeId.toString(), record])
  )

  const approvedEmployeeIds = new Set(
    existingPayrollRecords
      .filter((record) => record.approvalStatus === "approved")
      .map((record) => record.employeeId.toString())
  )

  const employeesNeedingPayroll = employees.filter(
    (emp) => !approvedEmployeeIds.has(emp._id.toString())
  )

  const payFrequency = company.payFrequency
  const taxRates = getTaxRates(startDateObj)

  const employeesToCreate = employeesNeedingPayroll.filter(
    (emp) => !pendingRecordsMap.has(emp._id.toString())
  )
  const employeesToUpdate = employeesNeedingPayroll.filter((emp) =>
    pendingRecordsMap.has(emp._id.toString())
  )

  // Batch YTD: single query for all employees instead of N individual queries
  const ytdMap = await batchGetPayrollYTDCore(
    company._id.toString(),
    employeesNeedingPayroll.map((emp) => emp._id.toString()),
    startDateObj
  )

  // Helper function to calculate payroll data
  const calculatePayrollData = (
    employee: LeanDoc<IEmployee>,
    existingRecord?: InstanceType<typeof Payroll>
  ) => {
    const { salary, workingHours } = employee.currentCompensation

    const employeeIdStr = employee._id.toString()
    const totalHours =
      employeeHours && employeeIdStr in employeeHours
        ? employeeHours[employeeIdStr]
        : calculateHours(workingHours, {
            type: payFrequency,
            startDate: startDateObj,
            endDate: endDateObj,
          })

    const regularPay = calculateGrossPay(salary, totalHours)

    const overtimePay = existingRecord?.earnings?.overtimePay || 0
    const commissionPay = existingRecord?.earnings?.commissionPay || 0
    const bonusPay = existingRecord?.earnings?.bonusPay || 0
    const otherPay = existingRecord?.earnings?.otherPay || 0

    const grossPay = RoundingToCents(
      regularPay + overtimePay + commissionPay + bonusPay + otherPay
    )

    const ytdResult = ytdMap.get(employeeIdStr)!

    const taxResult = calculatePayrollTaxesCore({
      grossPay,
      periodType: payFrequency,
      ytdGrossPay: ytdResult.salary.totalGrossPay,
      federalW4: employee.currentFederalW4,
      stateTax: employee.currentStateTax,
      companyRates: company.currentStateRate!,
      taxExemptions: employee.taxExemptions,
      taxRates,
    })

    return {
      totalHours,
      regularPay,
      overtimePay,
      commissionPay,
      bonusPay,
      otherPay,
      grossPay,
      taxResult,
    }
  }

  // Update existing pending records
  const updatePromises = employeesToUpdate.map(async (employee) => {
    const existingRecord = pendingRecordsMap.get(employee._id.toString())
    const calculatedData = calculatePayrollData(employee, existingRecord)

    await Payroll.findByIdAndUpdate(existingRecord!._id, {
      "hoursWorked.regularHours": calculatedData.totalHours,
      "hoursWorked.totalHours": calculatedData.totalHours,
      "earnings.regularPay": calculatedData.regularPay,
      "earnings.overtimePay": calculatedData.overtimePay,
      "earnings.commissionPay": calculatedData.commissionPay,
      "earnings.bonusPay": calculatedData.bonusPay,
      "earnings.otherPay": calculatedData.otherPay,
      "earnings.totalGrossPay": calculatedData.grossPay,
      "deductions.taxes": calculatedData.taxResult.employeeTaxes,
      employerTaxes: calculatedData.taxResult.employerTaxes,
      netPay: calculatedData.taxResult.netPay,
      "payPeriod.payDate": payDateObj,
      updatedAt: new Date(),
    })
  })

  await Promise.all(updatePromises)

  // Create new payroll records
  const payrollRecordsToCreate = employeesToCreate.map((employee) => {
    const calculatedData = calculatePayrollData(employee)

    return buildPayrollRecord({
      companyId: company._id.toString(),
      employee,
      payPeriod: {
        periodType: payFrequency,
        startDate: startDateObj,
        endDate: endDateObj,
        payDate: payDateObj,
      },
      hoursWorked: {
        regularHours: calculatedData.totalHours,
        overtimeHours: 0,
        totalHours: calculatedData.totalHours,
      },
      earnings: {
        regularPay: calculatedData.regularPay,
        overtimePay: calculatedData.overtimePay,
        bonusPay: calculatedData.bonusPay,
        commissionPay: calculatedData.commissionPay,
        otherPay: calculatedData.otherPay,
        totalGrossPay: calculatedData.grossPay,
      },
      taxResult: calculatedData.taxResult,
    })
  })

  if (payrollRecordsToCreate.length > 0) {
    await Payroll.insertMany(payrollRecordsToCreate)
  }

  return {
    createdCount: payrollRecordsToCreate.length,
    updatedCount: employeesToUpdate.length,
    approvedCount: approvedEmployeeIds.size,
  }
}



/**
 * Approve payroll records core logic.
 * Service layer function — takes userId, handles company lookup internally.
 */
export async function approvePayrollRecordsCore(
  userId: string,
  payrollIds: string[],
): Promise<{
  modifiedCount: number
  endDate?: Date
  alreadyApproved: boolean
}> {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id")
  if (!company) {
    throw new Error(COMPANY_ERRORS.NOT_FOUND)
  }

  if (!payrollIds || payrollIds.length === 0) {
    throw new Error("No payroll records specified.")
  }

  const result = await Payroll.updateMany(
    {
      _id: { $in: payrollIds },
      companyId: company._id,
      approvalStatus: "pending",
    },
    {
      $set: {
        approvalStatus: "approved",
        "approvalInfo.approvedBy": userId,
        "approvalInfo.approvedAt": new Date(),
      },
    },
  )

  if (result.modifiedCount === 0) {
    // Check if already approved
    const existingApproved = await Payroll.findOne({
      _id: { $in: payrollIds },
      companyId: company._id,
      approvalStatus: "approved",
    }).select("payPeriod.endDate")

    if (existingApproved) {
      return {
        modifiedCount: 0,
        endDate: existingApproved.payPeriod.endDate,
        alreadyApproved: true,
      }
    }

    throw new Error("No pending payroll records found to approve.")
  }

  // Get end date for tax sync
  const sampleRecord = await Payroll.findOne({
    _id: { $in: payrollIds },
    companyId: company._id,
    approvalStatus: "approved",
  }).select("payPeriod.endDate")

  return {
    modifiedCount: result.modifiedCount,
    endDate: sampleRecord?.payPeriod.endDate,
    alreadyApproved: false,
  }
}
