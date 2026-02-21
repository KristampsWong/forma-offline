"use server"

import { withAuth } from "@/lib/auth/auth-helpers"
import { getAllDe9RecordsCore } from "@/lib/services/tax/de9"
import { getAllDe9cRecordsCore } from "@/lib/services/tax/de9c"
import {
  getAllForm941FilingsCore,
  getFiledFilingRecordsCore,
} from "@/lib/services/tax/form941"
import { getAllForm940FilingsCore } from "@/lib/services/tax/form940"
import {
  getAllTaxPaymentsCore,
  getPaidPaymentRecordsCore,
} from "@/lib/services/tax/payments"
import type {
  De9Status,
  De9cStatus,
  Form940FilingStatus,
  Form941FilingStatus,
} from "@/lib/constants/tax-constants"
import type { Quarter } from "@/types/quarter"

// --- DE 9 ---

export type De9RecordList = {
  _id: string
  quarterNum: number
  year: number
  dueDate: Date
  totalDue: string
  status: De9Status
  filedDate?: Date
}

export async function getAllDe9Records() {
  return withAuth((userId) => getAllDe9RecordsCore(userId))
}

// --- DE 9C ---

export type De9cRecordList = {
  _id: string
  quarterNum: number
  year: number
  dueDate: Date
  status: De9cStatus
  filedDate?: Date
}

export async function getAllDe9cRecords() {
  return withAuth((userId) => getAllDe9cRecordsCore(userId))
}

// --- Form 941 / 940 Filings ---

export type Form941FilingRecord = {
  _id: string
  quarter: Quarter
  year: number
  periodStart: string
  periodEnd: string
  dueDate: string
  filingStatus: Form941FilingStatus
  filedDate?: string
  balanceDue: number
}

export type Form940FilingRecord = {
  _id: string
  year: number
  periodStart: string
  periodEnd: string
  dueDate: string
  filingStatus: Form940FilingStatus
  filedDate?: string
  line14_balanceDue: number
}

export async function getAllForm941Filings() {
  return withAuth((userId) => getAllForm941FilingsCore(userId))
}

export async function getAllForm940Filings() {
  return withAuth((userId) => getAllForm940FilingsCore(userId))
}

export async function getFiledFilingRecords(
  page: number,
  pageSize: number,
  _filter: string,
) {
  return withAuth((userId) =>
    getFiledFilingRecordsCore(userId, page, pageSize),
  )
}

// --- Tax Payments ---

export async function getAllTaxPayments() {
  return withAuth((userId) => getAllTaxPaymentsCore(userId))
}

export async function getPaidPaymentRecords(
  page: number,
  pageSize: number,
  _filter: string,
) {
  return withAuth((userId) =>
    getPaidPaymentRecordsCore(userId, page, pageSize),
  )
}
