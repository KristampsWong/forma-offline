"use server"

import { withAuth } from "@/lib/auth/auth-helpers"
import {
  createPayrollRecordCore,
  getPayrollRecordByIdCore,
  updatePayrollRecordCore,
} from "@/lib/services/payroll/crud"
import { getPayrollTableDataCore } from "@/lib/services/payroll/queries"
import { getPayrollYTDCore } from "@/lib/services/payroll/reporting"
import type { PayrollRecord } from "@/types/payroll"

/**
 * Get payroll table data for the payroll page
 */
export async function getPayrollTableData(startDate: string, endDate: string) {
  return withAuth((userId) =>
    getPayrollTableDataCore(userId, startDate, endDate),
  )
}

export async function createEmployeePayrollRecord(
  employeeId: string,
  startDate: string,
  endDate: string,
  payDate: string,
  hours?: number,
) {
  return withAuth((userId) =>
    createPayrollRecordCore(
      userId,
      employeeId,
      startDate,
      endDate,
      payDate,
      hours,
    ),
  )
}

export async function getPayrollRecordById(payrollId: string) {
  return withAuth((userId) => getPayrollRecordByIdCore(userId, payrollId))
}

export async function getPayrollYTDByEmployeeId(employeeId: string, startDate: string) {
  return withAuth((userId) => getPayrollYTDCore(userId, employeeId, startDate))
}

export async function updatePayrollRecord(
  payrollId: string,
  updateData: {
    hoursWorked: {
      regularHours: number
      overtimeHours: number
      totalHours: number
    }
    earnings: PayrollRecord["earnings"]
    deductions: {
      taxes: PayrollRecord["deductions"]["taxes"]
    }
    employerTaxes: PayrollRecord["employerTaxes"]
    netPay: number
  },
) {
  return withAuth((userId) =>
    updatePayrollRecordCore(userId, payrollId, updateData),
  )
}