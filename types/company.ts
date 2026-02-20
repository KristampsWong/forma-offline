import type { CompanyType, PayFrequency } from "@/lib/constants/employment-constants"

export interface CompanyStateRate {
  state: string
  ETTRate: number
  UIRate: number
  eddAccountNumber?: string
  effectiveDate: string
}

export interface CompanyAddress {
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
}

export interface CompanyData {
  _id: string
  name: string
  ein: string
  address: CompanyAddress
  userId: string
  currentStateRate: CompanyStateRate
  stateRatesHistory: CompanyStateRate[]
  companyType: CompanyType
  payFrequency: PayFrequency
  createdAt: string
  updatedAt: string
}
