import type { TaxPaymentType } from "@/lib/constants/tax-constants"
import type { Quarter } from "@/types/quarter"

export type TaxDeadline = {
  taxId: string
  taxType: TaxPaymentType
  date: Date
  formType: string
  quarter?: string
  description: string
  immediatePayment: boolean
}

// Serialized record types for client components (from lean queries)

export type Federal941Record = {
  _id: string
  periodStart: Date
  periodEnd: Date
  quarter: Quarter
  year: number
  federalIncomeTax: number
  socialSecurityTax: number
  socialSecurityEmployerTax: number
  medicareTax: number
  medicareEmployerTax: number
  totalTax: number
  dueDate: Date
  status: "pending" | "paid"
  paidDate?: Date
  requiresImmediatePayment: boolean
}

export type Federal940Record = {
  _id: string
  periodStart: Date
  periodEnd: Date
  quarter?: Quarter
  year: number
  futaEmployer: number
  totalTax: number
  dueDate: Date
  status: "pending" | "paid"
  paidDate?: Date
  requiresImmediatePayment: boolean
}

export type CAPitSdiRecord = {
  _id: string
  periodStart: Date
  periodEnd: Date
  quarter: Quarter
  year: number
  caIncomeTax: number
  caStateDisabilityIns: number
  totalTax: number
  dueDate: Date
  status: "pending" | "paid"
  paidDate?: Date
}

export type CASuiEttRecord = {
  _id: string
  periodStart: Date
  periodEnd: Date
  quarter: Quarter
  year: number
  caSuiEmployer: number
  caEtt: number
  totalTax: number
  dueDate: Date
  status: "pending" | "paid"
  paidDate?: Date
}
