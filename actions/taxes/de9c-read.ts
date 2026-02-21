"use server"

import { withAuth } from "@/lib/auth/auth-helpers"
import { getAllDe9cRecordsCore } from "@/lib/services/tax/de9c"
import type { De9cStatus } from "@/lib/constants/tax-constants"

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
