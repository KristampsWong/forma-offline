import type { PayFrequency, PayType } from "../constants"
import type { StateFilingStatus, WagePlanCode } from "../constants/tax-constants"
import type { TaxRates } from "../constants/tax-rates"
import type { IFederalW4, IStateTaxWithholding, ITaxExemptions } from "@/models/employee"
import type { IStateRate } from "@/models/company"

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

export interface TaxCalculationInput {
  grossPay: number
  periodType: PayFrequency
  ytdGrossPay: number
  federalW4?: IFederalW4
  stateTax?: IStateTaxWithholding
  companyRates: IStateRate
  taxExemptions?: ITaxExemptions
  taxRates: TaxRates
}

export interface TaxCalculationResult {
  employeeTaxes: {
    federalIncomeTax: number
    socialSecurityTax: number
    medicareTax: number
    stateIncomeTax: number
    localTax: number
    sdi: number
    total: number
  }
  employerTaxes: {
    socialSecurityTax: number
    medicareTax: number
    futa: number
    sui: number
    ett: number
    total: number
  }
  netPay: number
}
