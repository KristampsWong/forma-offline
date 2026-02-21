export type TaxPaymentType =
  | "federal941"
  | "federal940"
  | "caPitSdi"
  | "caSuiEtt"
  | "form941"
  | "form940"

export type TaxDeadline = {
  taxId: string
  taxType: TaxPaymentType
  date: Date
  formType: string
  quarter?: string
  description: string
  immediatePayment: boolean
}
