import type { ICompany } from "@/models/company"
import type { LeanDoc } from "@/types/db"

/**
 * Serialized company data for client components.
 * Uses LeanDoc to add `_id: string` from MongoDB lean queries.
 */
export type CompanyData = LeanDoc<ICompany>
