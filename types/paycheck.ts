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
