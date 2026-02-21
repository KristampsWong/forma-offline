"use server"

import { withAuth } from "@/lib/auth/auth-helpers"
import {
  createPayrollRecordCore,
  getPayrollRecordByIdCore,
  updatePayrollRecordCore,
} from "@/lib/services/payroll/crud"
import {
  approvePayrollRecordsCore,
  batchCreatePayrollRecordsCore,
} from "@/lib/services/payroll/batch"
import {
  getPayrollTableDataCore,
  getPreviewPayrollCore,
} from "@/lib/services/payroll/queries"
import { getPayrollYTDCore } from "@/lib/services/payroll/reporting"
import { syncAllTaxPaymentsFromApprovedPayrolls } from "@/lib/services/tax/payments"
import { createOrUpdateForm941FromApprovedPayrolls } from "@/lib/services/tax/form941"
import { createOrUpdateForm940FromApprovedPayrolls } from "@/lib/services/tax/form940"
import { createOrUpdateDe9FormData } from "@/lib/services/tax/de9"
import { createOrUpdateDe9cFormData } from "@/lib/services/tax/de9c"
import { getQuarter } from "@/lib/tax/deadlines"
import type { QuarterNumber } from "@/types/quarter"
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

/**
 * Get payroll preview data for the preview page
 */
export async function getPreviewPayroll(startDate: string, endDate: string) {
  return withAuth((userId) =>
    getPreviewPayrollCore(userId, startDate, endDate),
  )
}

/**
 * Approve payroll records (change status from pending to approved)
 * After approval, syncs tax payment records and tax forms from the approved payrolls.
 */
export async function approvePayrollRecords(payrollIds: string[]) {
  return withAuth(async (userId) => {
    const result = await approvePayrollRecordsCore(userId, payrollIds)

    // If we have an end date, trigger all tax syncs in parallel
    if (result.endDate) {
      const quarterStr = getQuarter(result.endDate)
      const quarterNumber = parseInt(quarterStr.replace("Q", ""), 10) as QuarterNumber

      const [taxPayments, form941, form940, de9, de9c] = await Promise.all([
        syncAllTaxPaymentsFromApprovedPayrolls(userId, result.endDate),
        createOrUpdateForm941FromApprovedPayrolls(userId, result.endDate),
        createOrUpdateForm940FromApprovedPayrolls(userId, result.endDate),
        createOrUpdateDe9FormData(userId, result.endDate.getUTCFullYear(), quarterNumber),
        createOrUpdateDe9cFormData(userId, result.endDate.getUTCFullYear(), quarterNumber),
      ])

      return {
        ...result,
        taxSyncStatus: {
          taxPayments: taxPayments.success
            ? { success: true as const }
            : { success: false as const, error: taxPayments.error },
          form941: form941.success
            ? { success: true as const }
            : { success: false as const, error: form941.error },
          form940: form940.success
            ? { success: true as const }
            : { success: false as const, error: form940.error },
          de9: de9.success
            ? { success: true as const }
            : { success: false as const, error: de9.error },
          de9c: de9c.success
            ? { success: true as const }
            : { success: false as const, error: de9c.error },
        },
      }
    }

    return result
  })
}

export async function batchCreateDefaultPayrollRecords(
  startDate: string,
  endDate: string,
  payDate: string,
  employeeHours?: Record<string, number>,
) {
  return withAuth((userId) =>
    batchCreatePayrollRecordsCore(
      userId,
      startDate,
      endDate,
      payDate,
      employeeHours,
    ),
  )
}
