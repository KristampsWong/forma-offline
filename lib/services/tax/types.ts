/**
 * Shared types for tax sync services
 */
import type { QuarterNumber } from "@/types/quarter"

export type { QuarterNumber }

export interface TaxSyncResult {
  success: boolean
  error?: string
}

export interface TaxSyncStatus {
  form941: TaxSyncResult
  form940: TaxSyncResult
  de9: TaxSyncResult
  de9c: TaxSyncResult
  taxPayments: TaxSyncResult
}
