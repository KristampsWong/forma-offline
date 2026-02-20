import type {
  CaliforniaDE4FilingStatus,
  EmploymentStatus,
  EmploymentType,
  FederalW4FilingStatus,
  FederalW4FormVersion,
  PayMethod,
  PayType,
  WagesPlanCode,
  WorkState,
} from "@/models/employee"
import type { PayFrequency } from "@/models/company"

// Re-export model types for convenience
export type {
  EmploymentStatus,
  EmploymentType,
  PayMethod,
  PayType,
  WagesPlanCode,
  WorkState,
} from "@/models/employee"

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
  address: {
    street1: string
    street2?: string
    city: string
    state: string
    zipCode: string
  }

  // Employment
  workState: WorkState
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
    formVersion: FederalW4FormVersion
    filingStatus: FederalW4FilingStatus
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
      filingStatus: CaliforniaDE4FilingStatus
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
    formVersion: FederalW4FormVersion
    filingStatus: FederalW4FilingStatus
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
      filingStatus: CaliforniaDE4FilingStatus
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
