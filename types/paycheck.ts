export interface Paycheck {
  _id: string
  periodStart: string
  periodEnd: string
  payDate: string
  grossPay: number
  netPay: number
  method: string
  approvalStatus: string
}

export interface PayrollRecordWithEmployee {
  _id: string
  employee: {
    employeeId: string
    firstName: string
    middleName?: string
    lastName: string
    ssn: string
    homeAddress: {
      street1: string
      street2?: string
      city: string
      state: string
      zipCode: string
    }
    payRate: number
  }
  periodStart: string
  periodEnd: string
  method: string
  taxes: {
    federalIncome: number
    socialSecurity: number
    medicare: number
    californiaIncome: number
    caSdi: number
  }
  employer: {
    companyName: string
    companyAddress: {
      line1: string
      line2?: string
      city: string
      state: string
      zip: string
    }
  }
  earnings: {
    regularPay: number
    overtimeHours: number
    overtimeRate: number
    overtimePay: number
    commissionPay: number
    otherPay: number
    totalGrossPay: number
  }
  employerTaxes: {
    futa: number
    socialSecurityTax: number
    medicareTax: number
    ett: number
    sui: number
    total: number
  }
  payDate: string
  netPay: number
  hoursWorked: number
  createdAt: string
  updatedAt: string
}
