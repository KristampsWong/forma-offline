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
  totalDeductions: number
  totalNetPay: number
  employerTotalFUTA: number
  employerTotalSocialSecurity: number
  employerTotalMedicare: number
  employerTotalCAETT: number
  employerTotalCASUI: number
  employerTotal: number
}
