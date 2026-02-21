import type {
  EmploymentStatus,
  PayMethod,
  PayType,
} from "@/lib/constants/employment-constants"
import type { ICompensation } from "@/models/employee"

export interface EmployeeStub {
  _id: string
  firstName: string
  lastName: string
  currentSalary: number
  payType: PayType
  currentPayMethod: PayMethod
  employmentStatus: EmploymentStatus
  currentWorkingHours: number
  hireDate: Date
  terminationDate?: Date
  compensationHistory: ICompensation[]
}

export interface PayrollRecordFromDB {
  _id: string
  employeeId: string
  employeeInfo: { firstName: string; lastName: string }
  payPeriod?: { periodType: string; startDate: Date; endDate: Date; payDate: Date }
  hoursWorked?: { totalHours: number }
  compensation: { payType: string; payRate: number }
  earnings: {
    regularPay: number
    overtimePay: number
    commissionPay: number
    otherPay: number
    totalGrossPay: number
  }
  deductions: {
    preTax: { total: number }
    taxes: {
      federalIncomeTax: number
      socialSecurityTax: number
      medicareTax: number
      stateIncomeTax: number
      sdi: number
      total: number
    }
    postTax: { total: number }
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
  approvalStatus: string
}
