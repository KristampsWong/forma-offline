import type {
  EmploymentStatus,
  EmploymentType,
  PayFrequency,
  PayMethod,
  PayType,
} from "@/lib/constants/employment-constants"
import type {
  FederalFilingStatus,
  StateFilingStatus,
  SupportedState,
  W4FormVersion,
} from "@/lib/constants/tax-constants"

export interface Address {
  street1: string
  street2?: string
  city: string
  state: string
  zipCode: string
}

/**
 * Serialized employee interfaces for client components.
 *
 * Primitive union types (PayType, PayMethod, etc.) live in @/lib/constants/.
 * This file defines the complex object shapes that server actions return
 * and client components consume (dates as ISO strings, ObjectIds as strings).
 */

/**
 * Serialized employee data for list views.
 * Dates are ISO strings for client component serialization.
 */
export interface EmployeeListItem {
  id: string
  firstName: string
  lastName: string
  currentCompensation: {
    salary: number
    payType: PayType
    workingHours: number
    effectiveDate: string
  }
  currentPayMethod: {
    payMethod: PayMethod
    effectiveDate: string
  }
  employmentStatus: EmploymentStatus
}

/**
 * Serialized employee detail for client components.
 * All dates are ISO strings, all ObjectIds are strings.
 */
export interface EmployeeDetail {
  id: string

  // Personal
  firstName: string
  middleName?: string
  lastName: string
  ssnMasked: string
  dateOfBirth: string
  email: string
  phoneNumber?: string
  address: Address

  // Employment
  workState: SupportedState
  hireDate: string
  employmentStatus: EmploymentStatus
  employmentType: EmploymentType
  department?: string
  position?: string

  // Compensation
  currentCompensation: {
    salary: number
    payType: PayType
    workingHours: number
    effectiveDate: string
  }
  payFrequency: PayFrequency
  currentPayMethod: {
    payMethod: PayMethod
    effectiveDate: string
  }

  // Federal W-4
  currentFederalW4?: {
    formVersion: W4FormVersion
    filingStatus: FederalFilingStatus
    multipleJobsOrSpouseWorks: boolean
    claimedDependentsDeduction: number
    otherIncome: number
    deductions: number
    extraWithholding: number
    effectiveDate: string
    submittedDate: string
  }

  // State tax (CA DE-4)
  currentStateTax?: {
    state: string
    californiaDE4?: {
      filingStatus: StateFilingStatus
      worksheetA: number
      worksheetB: number
      additionalWithholding: number
      exempt: boolean
      wagesPlanCode: string
      effectiveDate: string
      submittedDate: string
    }
    effectiveDate: string
  }

  // Tax exemptions
  taxExemptions: {
    futa: boolean
    fica: boolean
    suiEtt: boolean
    sdi: boolean
  }

  // History arrays
  compensationHistory: Array<{
    salary: number
    payType: PayType
    workingHours: number
    effectiveDate: string
    reason?: string
  }>
  payMethodHistory: Array<{
    payMethod: PayMethod
    effectiveDate: string
    reason?: string
  }>
  federalW4History: Array<{
    formVersion: W4FormVersion
    filingStatus: FederalFilingStatus
    multipleJobsOrSpouseWorks: boolean
    claimedDependentsDeduction: number
    otherIncome: number
    deductions: number
    extraWithholding: number
    effectiveDate: string
    submittedDate: string
    reason?: string
  }>
  stateTaxHistory: Array<{
    state: string
    californiaDE4?: {
      filingStatus: StateFilingStatus
      worksheetA: number
      worksheetB: number
      additionalWithholding: number
      exempt: boolean
      wagesPlanCode: string
      effectiveDate: string
      submittedDate: string
    }
    effectiveDate: string
    reason?: string
  }>
}
