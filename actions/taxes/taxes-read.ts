"use server"

import { withAuth } from "@/lib/auth/auth-helpers"
import {
  getAllTaxPaymentsCore,
  getPaidPaymentRecordsCore,
} from "@/lib/services/tax/payments"

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
