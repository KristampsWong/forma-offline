"use server"

import { withAuth } from "@/lib/auth/auth-helpers"
import {
  getAllForm941FilingsCore,
  getFiledFilingRecordsCore,
} from "@/lib/services/tax/form941"
import { getAllForm940FilingsCore } from "@/lib/services/tax/form940"
import type {
  Form940FilingStatus,
  Form941FilingStatus,
} from "@/lib/constants/tax-constants"
import type { Quarter } from "@/types/quarter"

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
