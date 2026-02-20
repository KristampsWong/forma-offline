"use server"

import { withAuth } from "@/lib/auth/auth-helpers"
import { getPayrollTableDataCore } from "@/lib/services/payroll.service"

/**
 * Get payroll table data for the payroll page
 */
export async function getPayrollTableData(
  startDate: string,
  endDate: string,
) {
  return withAuth((userId) =>
    getPayrollTableDataCore(userId, startDate, endDate)
  )
}
