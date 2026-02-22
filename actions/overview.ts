"use server"

import { withAuth } from "@/lib/auth/auth-helpers"
import {
  getYTDOverviewCore,
  getYearlyPayrollSummariesCore,
  getRecentPayrollActivitiesCore,
} from "@/lib/services/payroll/reporting"
import { getUnpaidTaxDeadlinesCore } from "@/lib/services/tax/payments"

export async function getYTDOverview(year: number) {
  return withAuth((userId) => getYTDOverviewCore(userId, year))
}

export async function getYearlyPayrollSummaries(year: number) {
  return withAuth((userId) => getYearlyPayrollSummariesCore(userId, year))
}

export async function getRecentPayrollActivities(month: number, year: number) {
  return withAuth((userId) =>
    getRecentPayrollActivitiesCore(userId, month, year),
  )
}

export async function getUnpaidTaxDeadlines() {
  return withAuth((userId) => getUnpaidTaxDeadlinesCore(userId))
}
