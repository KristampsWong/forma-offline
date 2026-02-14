/**
 * Validation Schemas Index
 * Central export for all Zod validation schemas and types
 */

// Employee schemas
export {
  type CompleteW4Form,
  completeW4Schema,
  type CreateEmployeeInput,
  createEmployeeSchema,
  type EmployeeStep1Form,
  employeeStep1Schema,
  type GetEmployeeByIdInput,
  getEmployeeByIdSchema,
  type UpdateBasePayForm,
  updateBasePaySchema,
  type UpdateEmployeeCompensationInput,
  updateEmployeeCompensationSchema,
  type UpdateEmployeeEmploymentInput,
  updateEmployeeEmploymentSchema,
  type UpdateEmployeePersonalInput,
  updateEmployeePersonalSchema,
  type UpdateEmployeeTaxInput,
  updateEmployeeTaxSchema,
  type UpdateEmploymentForm,
  updateEmploymentSchema,
  type UpdateFederalW4Form,
  updateFederalW4Schema,
  type UpdatePersonalForm,
  updatePersonalSchema,
  type UpdateStateDE4Form,
  updateStateDE4Schema,
  type UpdateTaxExemptionsForm,
  updateTaxExemptionsSchema,
} from "./employee-schema"

// Company schemas
export {
  type CompanyFormValues,
  companySchema,
  createCompanyInputSchema,
  type CreateCompanyInput,
  type StateRateFormValues,
  stateRateSchema,
  type UpdateCompanyFormValues,
  updateCompanySchema,
} from "./company-schema"

// User schemas
export {
  type MagicLinkRequestInput,
  magicLinkRequestSchema,
  type UserNameFormValues,
  userNameSchema,
} from "./user-schema"
