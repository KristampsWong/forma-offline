"use server"

import { withAuth } from "@/lib/auth/auth-helpers"
import { getAllDe9RecordsCore } from "@/lib/services/tax/de9"
import type { De9Status } from "@/lib/constants/tax-constants"

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
