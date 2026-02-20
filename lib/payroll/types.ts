import type { PayFrequency, PayType } from "../constants"
import type { StateFilingStatus, WagePlanCode } from "../constants/tax-constants"

// California state tax withholding information (Serialized for client)
export interface CaliforniaDE4 {
  filingStatus: StateFilingStatus
  worksheetA: number // Line 1a - Regular Withholding Allowances
  worksheetB: number // Line 1b - Estimated Deductions Allowances
  additionalWithholding: number // Line 2 - Additional amount to withhold (Worksheet C)
  exempt: boolean
  wagesPlanCode?: WagePlanCode
  effectiveDate: string // ISO date string
  endDate?: string // ISO date string
  submittedDate: string // ISO date string
}

export interface PayrollCalculationInput {
  employeeId: string
  firstName: string
  lastName: string
  currentSalary: number
  payType: PayType
  periodType: PayFrequency
  startDate: string
  endDate: string
  weeklyHours?: number // Default to 40 if not provided
}

export interface PayrollEmployeeData {
  id: string
  name: string
  regularPay: number
  hours: number
  grossPay: number
  payType: PayType
}
