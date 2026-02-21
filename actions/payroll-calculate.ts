"use server"

import { withAuth } from "@/lib/auth/auth-helpers"
import { calculatePayrollTaxesForEmployeeCore } from "@/lib/services/payroll/crud"
import type { PayFrequency } from "@/lib/constants/employment-constants"

/**
 * Calculate payroll taxes for a given employee and gross pay.
 * Called from the payroll form for real-time tax recalculation.
 */
export async function calculatePayrollTaxes(input: {
  employeeId: string
  grossPay: number
  periodType: PayFrequency
  payPeriodStartDate: string
}) {
  return withAuth((userId) =>
    calculatePayrollTaxesForEmployeeCore(
      userId,
      input.employeeId,
      input.grossPay,
      input.periodType,
      input.payPeriodStartDate,
    )
  )
}
