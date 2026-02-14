import { z } from "zod"

/**
 * Employee Form Validation Schemas
 * Zod schemas for employee creation and updates
 */

// Step 1: Basic Employee Information
export const employeeStep1Schema = z.object({
  // Personal Information
  firstName: z.string().min(1, "Required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Required"),
  ssn: z
    .string()
    .min(1, "Required")
    .regex(/^\d{3}-\d{2}-\d{4}$/, "Must be XXX-XX-XXXX format"),
  dateOfBirth: z.string().min(1, "Required"),

  // Contact Information
  email: z.string().min(1, "Required").email({ message: "Invalid email" }),
  phoneNumber: z.string().optional(),

  // Address
  street1: z.string().min(1, "Required"),
  street2: z.string().optional(),
  city: z.string().min(1, "Required"),
  state: z.enum(["CA"], { message: "Only California (CA) is supported for tax purposes" }),
  zipCode: z.string().regex(/^\d{5}$/, "Must be 5 digits"),

  // Employment Information
  hireDate: z.string().min(1, "Required"),
  workingHours: z.string().optional(),
  employmentType: z.enum(["W2"]),

  // Compensation
  payType: z.enum(["yearly", "hourly"]),
  currentSalary: z.string().min(1, "Required"),
  payMethod: z.enum(["check", "cash"]),
})

// Step 2: W-4 Tax Withholding Information
export const completeW4Schema = z.object({
  // Form Version
  formVersion: z.enum(["w4_2020_or_later"]),

  // Federal Withholding
  federalFilingStatus: z.string().min(1, "Required"),
  multipleJobsOrSpouseWorks: z.boolean(),
  claimedDependentsDeduction: z.string().optional(),
  otherIncome: z.string().optional(),
  deductions: z.string().optional(),
  extraWithholding: z.string().optional(),

  // State Withholding (California DE-4)
  stateFilingStatus: z.string().min(1, "Required"),
  regularAllowances: z
    .string()
    .min(1, "Required")
    .regex(/^\d+$/, "Must be a number")
    .refine((val) => parseInt(val, 10) >= 1, "Must be at least 1"),
  estimatedAllowances: z.string().optional(),
  stateAdditionalWithholding: z.string().optional(),

  // California Wage Plan Code
  californiaWagesPlanCode: z.string().min(1, "Required"),

  // Tax Exemptions
  futa: z.boolean(),
  fica: z.boolean(),
  suiEtt: z.boolean(),
  sdi: z.boolean(),
})

// Combined schema for createEmployee server action
export const createEmployeeSchema = z.object({
  step1: employeeStep1Schema,
  step2: completeW4Schema,
})

// Schema for getEmployeeById
export const getEmployeeByIdSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
})

// Schema for updateEmployeePersonal server action (includes employeeId)
export const updateEmployeePersonalSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  data: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    middleName: z.string().optional(),
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    phoneNumber: z.string().optional(),
    dateOfBirth: z
      .string()
      .min(1, "Date of birth is required")
      .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Must be MM/DD/YYYY format"),
    // Address fields
    street1: z.string().min(1, "Street address is required"),
    street2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    state: z.enum(["CA"], { message: "Only California (CA) is supported for tax purposes" }),
    zipCode: z.string().regex(/^\d{5}$/, "ZIP code must be 5 digits"),
  }),
})

// Schema for updating employee personal details (excludes SSN - SSN cannot be changed)
// Note: dateOfBirth uses string format (MM/DD/YYYY) to match InputWithCalendar component
// Note: state is restricted to CA only for tax purposes
export const updatePersonalSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional(),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  phoneNumber: z.string().optional(),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Must be MM/DD/YYYY format"),
  // Address fields
  street1: z.string().min(1, "Street address is required"),
  street2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.enum(["CA"], { message: "Only California (CA) is supported for tax purposes" }),
  zipCode: z.string().regex(/^\d{5}$/, "ZIP code must be 5 digits"),
})

// Schema for updating employee employment details
// Note: employmentType is excluded (always W2, displayed as read-only)
// Note: terminationDate is conditionally required when status is "terminated"
export const updateEmploymentSchema = z.object({
  hireDate: z
    .string()
    .min(1, "Hire date is required")
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Must be MM/DD/YYYY format"),
  employmentStatus: z.enum(["active", "terminated"]),
  terminationDate: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
}).refine((data) => {
  if (data.employmentStatus === "terminated") {
    return data.terminationDate && data.terminationDate.trim().length > 0
  }
  return true
}, { 
  message: "Termination date is required when status is terminated", 
  path: ["terminationDate"] 
})

// Action schema for updateEmployeeEmployment server action
export const updateEmployeeEmploymentSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  data: z.object({
    hireDate: z
      .string()
      .min(1, "Hire date is required")
      .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Must be MM/DD/YYYY format"),
    employmentStatus: z.enum(["active", "terminated"]),
    terminationDate: z.string().optional(),
    department: z.string().optional(),
    position: z.string().optional(),
  }).refine((data) => {
    if (data.employmentStatus === "terminated") {
      return data.terminationDate && data.terminationDate.trim().length > 0
    }
    return true
  }, { 
    message: "Termination date is required when status is terminated", 
    path: ["terminationDate"] 
  }),
})

// Schema for updating Federal W-4 withholding
// filingStatus uses FEDERAL_FILING_STATUSES constant values
export const updateFederalW4Schema = z.object({
  filingStatus: z.string().min(1, "Filing status is required"),
  multipleJobsOrSpouseWorks: z.boolean(),
  claimedDependentsDeduction: z.number().min(0, "Cannot be negative"),
  otherIncome: z.number().min(0, "Cannot be negative"),
  deductions: z.number().min(0, "Cannot be negative"),
  extraWithholding: z.number().min(0, "Cannot be negative"),
})

// Schema for updating California DE-4 state withholding
// filingStatus uses STATE_FILING_STATUSES constant values
export const updateStateDE4Schema = z.object({
  filingStatus: z.string().min(1, "Filing status is required"),
  worksheetA: z.number().min(0, "Cannot be negative"),
  worksheetB: z.number().min(0, "Cannot be negative"),
  additionalWithholding: z.number().min(0, "Cannot be negative"),
  exempt: z.boolean(),
})

// Schema for updating tax exemptions
export const updateTaxExemptionsSchema = z.object({
  futa: z.boolean(),
  fica: z.boolean(),
  suiEtt: z.boolean(),
  sdi: z.boolean(),
})

// Combined action schema for updateEmployeeTax server action
export const updateEmployeeTaxSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  federalW4: updateFederalW4Schema,
  stateDE4: updateStateDE4Schema,
  taxExemptions: updateTaxExemptionsSchema,
})

// Schema for updating employee base pay / compensation (form schema - uses strings)
// Note: workingHours can be 0 (e.g., for salaried exempt employees)
// Note: payMethod is check or cash only (no direct deposit)
export const updateBasePaySchema = z.object({
  salary: z
    .string()
    .min(1, "Salary is required")
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      "Must be a positive number"
    ),
  payType: z.enum(["hourly", "yearly"], {
    message: "Pay type is required",
  }),
  workingHours: z
    .string()
    .optional()
    .refine(
      (val) => val === undefined || val === "" || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
      "Must be zero or a positive number"
    ),
  payMethod: z.enum(["check", "cash"], {
    message: "Pay method is required",
  }),
})

// Action schema for updateEmployeeCompensation server action
export const updateEmployeeCompensationSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  data: updateBasePaySchema,
})

// Type exports
export type EmployeeStep1Form = z.infer<typeof employeeStep1Schema>
export type CompleteW4Form = z.infer<typeof completeW4Schema>
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>
export type GetEmployeeByIdInput = z.infer<typeof getEmployeeByIdSchema>
export type UpdatePersonalForm = z.infer<typeof updatePersonalSchema>
export type UpdateEmployeePersonalInput = z.infer<typeof updateEmployeePersonalSchema>
export type UpdateEmploymentForm = z.infer<typeof updateEmploymentSchema>
export type UpdateEmployeeEmploymentInput = z.infer<typeof updateEmployeeEmploymentSchema>
export type UpdateFederalW4Form = z.infer<typeof updateFederalW4Schema>
export type UpdateStateDE4Form = z.infer<typeof updateStateDE4Schema>
export type UpdateTaxExemptionsForm = z.infer<typeof updateTaxExemptionsSchema>
export type UpdateEmployeeTaxInput = z.infer<typeof updateEmployeeTaxSchema>
export type UpdateBasePayForm = z.infer<typeof updateBasePaySchema>
export type UpdateEmployeeCompensationInput = z.infer<typeof updateEmployeeCompensationSchema>
