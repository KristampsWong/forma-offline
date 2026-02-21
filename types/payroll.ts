export interface PayrollRecord {
  _id: string
  companyId: string
  employeeId: string
  employeeInfo: {
    firstName: string
    lastName: string
    middleName?: string
  }
  address: {
    street1: string
    street2?: string
    city: string
    state: string
    zipCode: string
  }
  payPeriod: {
    periodType: string
    startDate: string
    endDate: string
    payDate: string
  }
  hoursWorked: {
    regularHours: number
    overtimeHours: number
    doubleTimeHours: number
    sickHours: number
    vacationHours: number
    holidayHours: number
    totalHours: number
  }
  compensation: {
    payType: string
    payRate: number
    workingHours: number
  }
  payMethod: string
  federalW4?: {
    formVersion: string
    filingStatus: string
    multipleJobsOrSpouseWorks: boolean
    claimedDependentsDeduction: number
    otherIncome: number
    deductions: number
    extraWithholding: number
    effectiveDate: string
  }
  californiaDE4?: {
    filingStatus: string
    worksheetA: number
    worksheetB: number
    additionalWithholding: number
    exempt: boolean
    wagesPlanCode?: string
    effectiveDate: string
  }
  taxExemptions?: {
    futa: boolean
    fica: boolean
    suiEtt: boolean
    sdi: boolean
  }
  earnings: {
    regularPay: number
    overtimePay: number
    bonusPay: number
    commissionPay: number
    otherPay: number
    totalGrossPay: number
  }
  deductions: {
    preTax: {
      retirement401k: number
      healthInsurance: number
      dentalInsurance: number
      visionInsurance: number
      hsaFsa: number
      other: number
      total: number
    }
    taxes: {
      federalIncomeTax: number
      socialSecurityTax: number
      medicareTax: number
      stateIncomeTax: number
      localTax: number
      sdi: number
      total: number
    }
    postTax: {
      garnishments: number
      unionDues: number
      charitableDonations: number
      other: number
      total: number
    }
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
  notes?: string
  companyRates: {
    uiRate: number
    ettRate: number
  }
  createdAt: string
  updatedAt: string
}

export interface PayrollTableData {
  id: string
  payrollRecordId?: string
  name: string
  regularPay: number
  hours: number
  grossPay: number
  payType: string
  status: string
}

export interface PayrollPreviewData {
  payrollId: string
  employeeId: string
  employeeName: string
  totalHours: number
  grossPay: number
  employeeTaxesAndDeductions: number
  netPay: number
  employerTaxesAndContributions: number
  payFrequency: string
}

export interface PayrollPreviewOverview {
  totalPayrollCost: number
  totalGrossPay: number
  totalEmployerTaxesAndContributions: number
  totalNetPay: number
  payPeriodStart: string
  payPeriodEnd: string
  payDate: string
}

export interface YTDData {
  salary: {
    regularPay: number
    overtimePay: number
    commissionPay: number
    otherPay: number
    totalGrossPay: number
  }
  totalFederalTax: number
  totalStateTax: number
  totalSocialSecurity: number
  totalMedicare: number
  totalSDI: number
  totalEmployeeTaxes: number
  totalDeductions: number
  totalNetPay: number
  employerTotalFUTA: number
  employerTotalSocialSecurity: number
  employerTotalMedicare: number
  employerTotalCAETT: number
  employerTotalCASUI: number
  employerTotal: number
}
