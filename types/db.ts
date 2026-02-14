/**
 * Utility type for MongoDB lean documents.
 * Adds `_id` as a string (from ObjectId.toString()) to any model interface.
 *
 * Usage:
 *   const company = await Company.findOne(...).lean<LeanDoc<ICompany>>()
 */
export type LeanDoc<T> = T & { _id: string }
