import { z } from "zod"

// ========================================
// Reusable validation rules
// ========================================

const nameValidation = z
  .string()
  .min(2, { message: "Company name must be at least 2 characters." })

const einValidation = z
  .string()
  .trim() // Remove leading/trailing whitespace
  .min(1, { message: "EIN is required" })
  .regex(
    /^\d{2}-\d{7}$/,
    { message: "EIN must be in format XX-XXXXXXX" }
  )

const zipValidation = z
  .string()
  .regex(/^\d{5}(-\d{4})?$/, {
    message: "ZIP code must be 5 digits or ZIP+4 format (e.g., 12345 or 12345-6789)."
  })

const cityValidation = z
  .string()
  .min(2, { message: "City must be at least 2 characters." })

const stateValidation = z
  .string()
  .min(2, { message: "State must be at least 2 characters." })

const payFrequencyValidation = z.enum(["biweekly", "monthly"])

// ========================================
// Client-side form schema (flat structure)
// ========================================

export const companySchema = z.object({
  name: nameValidation,
  address: z
    .string()
    .min(5, { message: "Address must be at least 5 characters." }),
  line2: z.string().optional(),
  city: cityValidation,
  state: stateValidation,
  zip: zipValidation,
  ein: einValidation,
  payFrequency: payFrequencyValidation,
})

export type CompanyFormValues = z.infer<typeof companySchema>

// Schema for updating company profile (EIN cannot be changed)
export const updateCompanySchema = companySchema.omit({ ein: true })

export type UpdateCompanyFormValues = z.infer<typeof updateCompanySchema>

// ========================================
// Server-side schema (nested address object)
// ========================================

// Reuse validations from companySchema, but restructure address as nested object
export const createCompanyInputSchema = companySchema
  .pick({
    name: true,
    ein: true,
    payFrequency: true,
  })
  .extend({
    address: z.object({
      line1: z.string().min(1, { message: "Address line 1 is required." }),
      line2: z.string().optional(),
      city: cityValidation,
      state: stateValidation,
      zip: zipValidation,
    }),
  })

export type CreateCompanyInput = z.infer<typeof createCompanyInputSchema>

// ========================================
// State Tax Rate Schema
// ========================================

export const stateRateSchema = z.object({
  uiRate: z
    .string()
    .regex(/^\d*\.?\d*$/, "Only numbers and decimal point allowed")
    .refine((val) => val !== "" && val !== ".", "UI Rate is required")
    .refine((val) => {
      const num = parseFloat(val)
      return !Number.isNaN(num) && num >= 0 && num <= 100
    }, "UI Rate must be between 0 and 100"),
  ettRate: z
    .string()
    .regex(/^\d*\.?\d*$/, "Only numbers and decimal point allowed")
    .refine((val) => val !== "" && val !== ".", "ETT Rate is required")
    .refine((val) => {
      const num = parseFloat(val)
      return !Number.isNaN(num) && num >= 0 && num <= 100
    }, "ETT Rate must be between 0 and 100"),
  eddAccountNumber: z
    .string()
    .regex(/^\d*$/, "Only numbers allowed")
    .length(8, "EDD Account Number must be exactly 8 digits"),
  effectiveDate: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Date must be in MM/DD/YYYY format")
    .refine((val) => {
      const [month, day, year] = val.split("/").map(Number)
      const date = new Date(year, month - 1, day)
      return !isNaN(date.getTime())
    }, "Invalid date"),
})

export type StateRateFormValues = z.infer<typeof stateRateSchema>
