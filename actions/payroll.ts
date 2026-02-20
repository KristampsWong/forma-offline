"use server"

import { withAuth } from "@/lib/auth/auth-helpers"
import { createPayrollRecordCore } from "@/lib/services/payroll/crud"
import { getPayrollTableDataCore } from "@/lib/services/payroll/queries"

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
