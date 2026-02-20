import mongoose, { Document, Model, Types } from "mongoose"

import { decryptSSN } from "@/lib/encryption/ssn"

/**
 * Payroll Model
 *
 * Stores payroll records for employees including:
 * - Company and employee base information (snapshot at time of payroll)
 * - Pay period and hours worked details
 * - Federal W-4 and California DE-4 tax withholding snapshots
 * - Earnings breakdown (regular, overtime, bonus, etc.)
 * - Deductions (pre-tax, taxes, post-tax)
 * - Employer tax obligations
 * - Approval workflow
 *
 * Security:
 * - SSN stored in employeeInfo is encrypted (copied from Employee model)
 * - All queries must filter by companyId for tenant isolation
 */

// --- Types ---

export type FederalW4SnapshotFormVersion =
  | "w4_2020_or_later"
  | "w4_2019_or_earlier"

export type FederalW4SnapshotFilingStatus =
  | "single_or_married_separately"
  | "married_jointly_or_qualifying_surviving"
  | "head_of_household"
  | "exempt"

export interface IFederalW4Snapshot {
  formVersion: FederalW4SnapshotFormVersion
  filingStatus: FederalW4SnapshotFilingStatus
  multipleJobsOrSpouseWorks: boolean
  claimedDependentsDeduction: number
  otherIncome: number
  deductions: number
  extraWithholding: number
  effectiveDate: Date
}

export type CaliforniaDE4SnapshotFilingStatus =
  | "single_or_married(with_two_or_more_incomes)"
  | "married(one_income)"
  | "head_of_household"
  | "do_not_withhold"

export type PayrollWagesPlanCode = "A" | "S" | "J" | "P"

export interface ICaliforniaDE4Snapshot {
  filingStatus: CaliforniaDE4SnapshotFilingStatus
  worksheetA: number
  worksheetB: number
  additionalWithholding: number
  exempt: boolean
  wagesPlanCode?: PayrollWagesPlanCode
  effectiveDate: Date
}

export interface ITaxExemptions {
  futa: boolean
  fica: boolean
  suiEtt: boolean
  sdi: boolean
}

export interface IEarnings {
  regularPay: number
  overtimePay: number
  bonusPay: number
  commissionPay: number
  otherPay: number
  totalGrossPay: number
}

export interface IPreTaxDeductions {
  retirement401k: number
  healthInsurance: number
  dentalInsurance: number
  visionInsurance: number
  hsaFsa: number
  other: number
  total: number
}

export interface ITaxDeductions {
  federalIncomeTax: number
  socialSecurityTax: number
  medicareTax: number
  stateIncomeTax: number
  localTax: number
  sdi: number
  total: number
}

export interface IPostTaxDeductions {
  garnishments: number
  unionDues: number
  charitableDonations: number
  other: number
  total: number
}

export interface IEmployerTaxes {
  socialSecurityTax: number
  medicareTax: number
  futa: number
  sui: number
  ett: number
  total: number
}

export type PayrollPeriodType = "biweekly" | "monthly"
export type PayrollPayType = "hourly"
export type PayrollPayMethod = "check" | "cash"
export type PayrollApprovalStatus = "pending" | "approved"

export interface IPayrollEmployeeInfo {
  firstName: string
  lastName: string
  middleName?: string
  ssn: string
  email: string
}

export interface IPayPeriod {
  periodType: PayrollPeriodType
  startDate: Date
  endDate: Date
  payDate: Date
}

export interface IHoursWorked {
  regularHours: number
  overtimeHours: number
  doubleTimeHours: number
  sickHours: number
  vacationHours: number
  holidayHours: number
  totalHours: number
}

export interface IPayrollCompensation {
  payType: PayrollPayType
  payRate: number
  workingHours: number
}

export interface IPayrollDeductions {
  preTax: IPreTaxDeductions
  taxes: ITaxDeductions
  postTax: IPostTaxDeductions
}

export interface IApprovalInfo {
  approvedBy?: string
  approvedAt?: Date
}

export interface IPayroll {
  companyId: Types.ObjectId
  employeeId: Types.ObjectId
  employeeInfo: IPayrollEmployeeInfo
  payPeriod: IPayPeriod
  hoursWorked: IHoursWorked
  compensation: IPayrollCompensation
  payMethod: PayrollPayMethod
  federalW4?: IFederalW4Snapshot
  californiaDE4?: ICaliforniaDE4Snapshot
  taxExemptions?: ITaxExemptions
  earnings: IEarnings
  deductions: IPayrollDeductions
  employerTaxes: IEmployerTaxes
  netPay: number
  approvalStatus: PayrollApprovalStatus
  approvalInfo?: IApprovalInfo
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export type PayrollDocument = IPayroll &
  Document & {
    employeeInfo: IPayrollEmployeeInfo & {
      ssnMasked: string
      ssnDecrypted: string
    }
  }

// --- Schemas ---

// Federal W-4 tax withholding snapshot schema
const FederalW4SnapshotSchema = new mongoose.Schema<IFederalW4Snapshot>({
  formVersion: {
    type: String,
    enum: ["w4_2020_or_later", "w4_2019_or_earlier"],
    required: true,
  },
  filingStatus: {
    type: String,
    enum: [
      "single_or_married_separately",
      "married_jointly_or_qualifying_surviving",
      "head_of_household",
      "exempt",
    ],
    required: true,
  },
  multipleJobsOrSpouseWorks: {
    type: Boolean,
    default: false,
  },
  claimedDependentsDeduction: {
    type: Number,
    default: 0,
    min: 0,
  },
  otherIncome: {
    type: Number,
    default: 0,
    min: 0,
  },
  deductions: {
    type: Number,
    default: 0,
    min: 0,
  },
  extraWithholding: {
    type: Number,
    default: 0,
    min: 0,
  },
  effectiveDate: {
    type: Date,
    required: true,
  },
})

// California DE-4 tax withholding snapshot schema
const CaliforniaDE4SnapshotSchema =
  new mongoose.Schema<ICaliforniaDE4Snapshot>({
    filingStatus: {
      type: String,
      enum: [
        "single_or_married(with_two_or_more_incomes)",
        "married(one_income)",
        "head_of_household",
        "do_not_withhold",
      ],
      required: true,
    },
    worksheetA: {
      type: Number,
      default: 0,
      min: 0,
    },
    worksheetB: {
      type: Number,
      default: 0,
      min: 0,
    },
    additionalWithholding: {
      type: Number,
      default: 0,
      min: 0,
    },
    exempt: {
      type: Boolean,
      default: false,
    },
    wagesPlanCode: {
      type: String,
      enum: ["A", "S", "J", "P"],
      required: false,
    },
    effectiveDate: {
      type: Date,
      required: true,
    },
  })

// Tax exemptions schema
const TaxExemptionsSchema = new mongoose.Schema<ITaxExemptions>({
  futa: {
    type: Boolean,
    default: false,
  },
  fica: {
    type: Boolean,
    default: false,
  },
  suiEtt: {
    type: Boolean,
    default: false,
  },
  sdi: {
    type: Boolean,
    default: false,
  },
})

// Earnings schema
const EarningsSchema = new mongoose.Schema<IEarnings>({
  regularPay: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  overtimePay: {
    type: Number,
    default: 0,
    min: 0,
  },
  bonusPay: {
    type: Number,
    default: 0,
    min: 0,
  },
  commissionPay: {
    type: Number,
    default: 0,
    min: 0,
  },
  otherPay: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalGrossPay: {
    type: Number,
    required: true,
    min: 0,
  },
})

// Pre-tax deductions schema
const PreTaxDeductionsSchema = new mongoose.Schema<IPreTaxDeductions>({
  retirement401k: {
    type: Number,
    default: 0,
    min: 0,
  },
  healthInsurance: {
    type: Number,
    default: 0,
    min: 0,
  },
  dentalInsurance: {
    type: Number,
    default: 0,
    min: 0,
  },
  visionInsurance: {
    type: Number,
    default: 0,
    min: 0,
  },
  hsaFsa: {
    type: Number,
    default: 0,
    min: 0,
  },
  other: {
    type: Number,
    default: 0,
    min: 0,
  },
  total: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
})

// Tax deductions schema
const TaxDeductionsSchema = new mongoose.Schema<ITaxDeductions>({
  federalIncomeTax: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  socialSecurityTax: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  medicareTax: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  stateIncomeTax: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  localTax: {
    type: Number,
    default: 0,
    min: 0,
  },
  sdi: {
    type: Number,
    default: 0,
    min: 0,
  },
  total: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
})

// Post-tax deductions schema
const PostTaxDeductionsSchema = new mongoose.Schema<IPostTaxDeductions>({
  garnishments: {
    type: Number,
    default: 0,
    min: 0,
  },
  unionDues: {
    type: Number,
    default: 0,
    min: 0,
  },
  charitableDonations: {
    type: Number,
    default: 0,
    min: 0,
  },
  other: {
    type: Number,
    default: 0,
    min: 0,
  },
  total: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
})

// Employer taxes schema
const EmployerTaxesSchema = new mongoose.Schema<IEmployerTaxes>({
  socialSecurityTax: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  medicareTax: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  futa: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  sui: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  ett: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  total: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
})

// Main Payroll schema
const PayrollSchema = new mongoose.Schema<PayrollDocument>(
  {
    // Company ID (references Company model)
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // Employee ID (references Employee model)
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },

    // Employee info snapshot (denormalized for historical records)
    employeeInfo: {
      firstName: {
        type: String,
        required: true,
        trim: true,
      },
      lastName: {
        type: String,
        required: true,
        trim: true,
      },
      middleName: {
        type: String,
        trim: true,
      },
      ssn: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },
    },

    // Pay period info
    payPeriod: {
      periodType: {
        type: String,
        enum: ["biweekly", "monthly"],
        required: true,
      },
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
      payDate: {
        type: Date,
        required: true,
      },
    },

    // Hours worked info
    hoursWorked: {
      regularHours: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },
      overtimeHours: {
        type: Number,
        default: 0,
        min: 0,
      },
      doubleTimeHours: {
        type: Number,
        default: 0,
        min: 0,
      },
      sickHours: {
        type: Number,
        default: 0,
        min: 0,
      },
      vacationHours: {
        type: Number,
        default: 0,
        min: 0,
      },
      holidayHours: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalHours: {
        type: Number,
        required: true,
        min: 0,
      },
    },

    // Compensation info snapshot
    compensation: {
      payType: {
        type: String,
        enum: ["hourly"],
        required: true,
      },
      payRate: {
        type: Number,
        required: true,
        min: 0,
      },
      workingHours: {
        type: Number,
        required: true,
        min: 0,
        max: 168,
        default: 40,
      },
    },

    // Payment method
    payMethod: {
      type: String,
      enum: ["check", "cash"],
      required: true,
    },

    // Federal W-4 snapshot (tax config used for this pay period)
    federalW4: FederalW4SnapshotSchema,

    // California DE-4 snapshot (tax config used for this pay period)
    californiaDE4: CaliforniaDE4SnapshotSchema,

    // Tax exemptions
    taxExemptions: TaxExemptionsSchema,

    // Earnings breakdown
    earnings: {
      type: EarningsSchema,
      required: true,
    },

    // Deductions breakdown
    deductions: {
      preTax: {
        type: PreTaxDeductionsSchema,
        required: true,
      },
      taxes: {
        type: TaxDeductionsSchema,
        required: true,
      },
      postTax: {
        type: PostTaxDeductionsSchema,
        required: true,
      },
    },

    // Employer taxes
    employerTaxes: {
      type: EmployerTaxesSchema,
      required: true,
    },

    // Net pay
    netPay: {
      type: Number,
      required: true,
      min: 0,
    },

    // Approval status
    approvalStatus: {
      type: String,
      enum: ["pending", "approved"],
      default: "pending",
      required: true,
      index: true,
    },

    // Approval info
    approvalInfo: {
      approvedBy: String,
      approvedAt: Date,
    },

    // Notes
    notes: String,
  },
  {
    timestamps: true,
  }
)

// Indexes for common queries and uniqueness
// Unique constraint: one payroll record per employee per pay period
PayrollSchema.index(
  { companyId: 1, employeeId: 1, "payPeriod.startDate": 1 },
  {
    unique: true,
    name: "unique_employee_pay_period",
  }
)

// Query by company and date range
PayrollSchema.index({
  companyId: 1,
  "payPeriod.startDate": 1,
  "payPeriod.endDate": 1,
})

// Query by company and approval status
PayrollSchema.index({ companyId: 1, approvalStatus: 1 })

// Query by employee and approval status
PayrollSchema.index({ employeeId: 1, approvalStatus: 1 })

// Query by pay date
PayrollSchema.index({ "payPeriod.payDate": 1 })

// ============================================================================
// SSN Security: Virtual fields and toJSON transform
// ============================================================================

/**
 * Virtual field for masked SSN display (e.g., "***-**-6789")
 * Use this for UI display instead of raw encrypted SSN
 */
PayrollSchema.virtual("employeeInfo.ssnMasked").get(function () {
  const ssn = this.employeeInfo?.ssn
  if (!ssn) return null

  try {
    const decrypted = decryptSSN(ssn)
    // Return last 4 digits with mask
    return `***-**-${decrypted.slice(-4)}`
  } catch {
    return "***-**-****"
  }
})

/**
 * Virtual field for decrypted SSN (admin only)
 * CRITICAL: Only use when full SSN is required and user has admin/owner role
 * Always log access for audit trail
 */
PayrollSchema.virtual("employeeInfo.ssnDecrypted").get(function () {
  const ssn = this.employeeInfo?.ssn
  if (!ssn) return null

  try {
    return decryptSSN(ssn)
  } catch {
    return null
  }
})

/**
 * toJSON transform to prevent SSN exposure in API responses
 * - Removes raw encrypted SSN field
 * - Includes virtual fields (ssnMasked)
 */
PayrollSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    // Remove raw encrypted SSN - use ssnMasked or ssnDecrypted virtuals instead
    if (ret.employeeInfo && typeof ret.employeeInfo === "object") {
      delete (ret.employeeInfo as unknown as Record<string, unknown>).ssn
    }
    // Remove internal Mongoose fields
    delete (ret as unknown as Record<string, unknown>).__v
    return ret
  },
})

PayrollSchema.set("toObject", {
  virtuals: true,
})

export default (mongoose.models.Payroll as Model<PayrollDocument>) ||
  mongoose.model<PayrollDocument>("Payroll", PayrollSchema)
