import mongoose, { Document, Model, Types } from "mongoose"

import {
  decryptSSN,
  encryptSSN,
  hashSSN,
  isEncrypted,
  maskSSN,
} from "@/lib/encryption/ssn"
import { logger } from "@/lib/logger"
import type {
  EmploymentStatus,
  EmploymentType,
  PayMethod,
  PayType,
} from "@/lib/constants/employment-constants"
import type {
  FederalFilingStatus,
  StateFilingStatus,
  SupportedState,
  W4FormVersion,
  WagePlanCode,
} from "@/lib/constants/tax-constants"

/**
 * Employee Model
 *
 * Manages employee payroll data including:
 * - Personal information (name, SSN, address)
 * - Employment status and dates
 * - Federal W-4 tax withholding (for 941 and W-2)
 * - State tax withholding (California DE-4)
 * - Compensation history (salary/hourly)
 * - Pay method history
 *
 * Security:
 * - SSN is encrypted at rest using AES-256-GCM
 * - Automatic encryption on save (pre-save hook)
 * - Virtual fields for decrypted and masked SSN access
 * - Format validation before encryption
 */

// --- Types ---

export interface ICaliforniaDE4 {
  filingStatus: StateFilingStatus
  worksheetA: number
  worksheetB: number
  additionalWithholding: number
  exempt: boolean
  wagesPlanCode?: WagePlanCode
  effectiveDate: Date
  endDate?: Date
  submittedDate: Date
}

export interface IFederalW4 {
  formVersion: W4FormVersion
  filingStatus: FederalFilingStatus
  multipleJobsOrSpouseWorks: boolean
  claimedDependentsDeduction: number
  otherIncome: number
  deductions: number
  extraWithholding: number
  effectiveDate: Date
  endDate?: Date
  submittedDate: Date
  reason?: string
}

export interface IStateTaxWithholding {
  state: SupportedState
  californiaDE4?: ICaliforniaDE4
  effectiveDate: Date
  endDate?: Date
  reason?: string
}

export interface ICompensation {
  salary: number
  payType: PayType
  workingHours: number
  effectiveDate: Date
  endDate?: Date
  reason?: string
}

export interface IPayMethodRecord {
  payMethod: PayMethod
  effectiveDate: Date
  endDate?: Date
  reason?: string
}

export interface IEmployeeAddress {
  street1: string
  street2?: string
  city: string
  state: string
  zipCode: string
}

export interface ITaxExemptions {
  futa: boolean
  fica: boolean
  suiEtt: boolean
  sdi: boolean
}

export interface IEmployee {
  companyId: Types.ObjectId
  firstName: string
  lastName: string
  middleName?: string
  ssn: string
  ssnHash?: string
  dateOfBirth: Date
  email: string
  phoneNumber?: string
  address: IEmployeeAddress
  workState: SupportedState
  hireDate: Date
  terminationDate?: Date
  employmentStatus: EmploymentStatus
  employmentType: EmploymentType
  department?: string
  position?: string
  currentCompensation: {
    salary: number
    payType: PayType
    workingHours: number
    effectiveDate: Date
  }
  currentPayMethod: {
    payMethod: PayMethod
    effectiveDate: Date
  }
  currentFederalW4?: IFederalW4
  currentStateTax?: IStateTaxWithholding
  taxExemptions: ITaxExemptions
  compensationHistory: ICompensation[]
  payMethodHistory: IPayMethodRecord[]
  federalW4History: IFederalW4[]
  stateTaxHistory: IStateTaxWithholding[]
  createdAt: Date
  updatedAt: Date
}

export type EmployeeDocument = IEmployee &
  Document & {
    ssnMasked: string
    ssnDecrypted: string
  }

// --- Schemas ---

// California state tax withholding schema (DE-4 form)
const CaliforniaDE4Schema = new mongoose.Schema<ICaliforniaDE4>({
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
  endDate: Date,
  submittedDate: {
    type: Date,
    default: Date.now,
  },
})

// Federal W-4 tax withholding schema (for 941 and W-2 forms)
const FederalW4Schema = new mongoose.Schema<IFederalW4>({
  formVersion: {
    type: String,
    enum: ["w4_2020_or_later", "w4_2019_or_earlier"],
    default: "w4_2020_or_later",
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
  endDate: Date,
  submittedDate: {
    type: Date,
    default: Date.now,
  },
  reason: String,
})

// State tax withholding schema (supports future expansion to other states)
const StateTaxWithholdingSchema = new mongoose.Schema<IStateTaxWithholding>({
  state: {
    type: String,
    enum: ["CA"],
    required: true,
  },
  californiaDE4: CaliforniaDE4Schema,
  effectiveDate: {
    type: Date,
    required: true,
  },
  endDate: Date,
  reason: String,
})

// Compensation history schema (for W-2 and 941)
const CompensationSchema = new mongoose.Schema<ICompensation>({
  salary: {
    type: Number,
    required: true,
    min: 0,
  },
  payType: {
    type: String,
    enum: ["yearly", "hourly"],
    required: true,
  },
  workingHours: {
    type: Number,
    min: 0,
    max: 168,
    default: 40,
  },
  effectiveDate: {
    type: Date,
    required: true,
  },
  endDate: Date,
  reason: String,
})

// Pay method history schema
const PayMethodSchema = new mongoose.Schema<IPayMethodRecord>({
  payMethod: {
    type: String,
    enum: ["check", "cash"],
    required: true,
  },
  effectiveDate: {
    type: Date,
    required: true,
  },
  endDate: Date,
  reason: String,
})

// Main Employee Schema
const EmployeeSchema = new mongoose.Schema<EmployeeDocument>(
  {
    // Company reference (links to Company model)
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
    index: true,
  },

    // Basic personal information (required for W-2)
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
      index: true,
      validate: {
        validator: function (v: string) {
          // Allow encrypted format (iv:authTag:encrypted) or plain format (XXX-XX-XXXX)
          if (isEncrypted(v)) return true
          return /^\d{3}-?\d{2}-?\d{4}$/.test(v)
        },
        message: "SSN must be in XXX-XX-XXXX format or encrypted format",
      },
    },
    ssnHash: {
      type: String,
      index: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },

    // Contact information
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },

    // Address information (required for W-2)
    address: {
    street1: {
      type: String,
      required: true,
    },
      street2: String,
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
        uppercase: true,
      },
      zipCode: {
        type: String,
        required: true,
        validate: {
          validator: (v: string) => /^\d{5}(-\d{4})?$/.test(v),
          message: "ZIP code must be 5 or 9 digits",
        },
      },
    },

    // Work location state (for state tax calculations)
    workState: {
      type: String,
      enum: ["CA"],
      required: true,
      default: "CA",
    },

    // Employment information (required for 940, 941)
    hireDate: {
      type: Date,
      required: true,
    },
    terminationDate: Date,
    employmentStatus: {
      type: String,
      enum: ["active", "terminated"],
      default: "active",
    },
    employmentType: {
      type: String,
      enum: ["W2", "1099"],
      required: true,
      default: "W2",
    },

    // Job information (optional, for internal management)
    department: String,
    position: String,

    // Current compensation (unified object structure)
    currentCompensation: {
      salary: {
        type: Number,
        required: true,
        min: 0,
      },
      payType: {
        type: String,
        enum: ["yearly", "hourly"],
        required: true,
        default: "yearly",
      },
      workingHours: {
        type: Number,
        min: 0,
        max: 168,
        default: 0,
      },
      effectiveDate: {
        type: Date,
        required: true,
      },
    },

    // Current pay method (unified object structure)
    currentPayMethod: {
      payMethod: {
        type: String,
        enum: ["check", "cash"],
        required: true,
        default: "check",
      },
      effectiveDate: {
        type: Date,
        required: true,
      },
    },

    // Current tax withholding settings
    currentFederalW4: FederalW4Schema,
    currentStateTax: StateTaxWithholdingSchema,

    // Tax exemptions
    taxExemptions: {
      futa: { type: Boolean, default: false },
      fica: { type: Boolean, default: false },
      suiEtt: { type: Boolean, default: false },
      sdi: { type: Boolean, default: false },
    },

    // Historical records (for annual W-2 generation)
    compensationHistory: [CompensationSchema],
    payMethodHistory: [PayMethodSchema],
    federalW4History: [FederalW4Schema],
    stateTaxHistory: [StateTaxWithholdingSchema],
  },
  {
    timestamps: true,
  }
)

// Encryption hooks
EmployeeSchema.pre("save", async function () {
  // Encrypt SSN before saving if it's not already encrypted
  if (this.isModified("ssn") && !isEncrypted(this.ssn)) {
    try {
      // CRITICAL: Order matters - compute hash BEFORE encryption
      // 1. Hash needs plaintext SSN (SHA-256 for duplicate detection)
      this.ssnHash = hashSSN(this.ssn)
      // 2. Then encrypt for storage (AES-256-GCM with random IV)
      this.ssn = encryptSSN(this.ssn)
      // This "hash + encrypt" pattern enables:
      // - Duplicate detection via indexed hash (O(1) lookups)
      // - Secure storage with non-deterministic encryption
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("Failed to encrypt SSN")
    }
  }
})

// Virtual fields for SSN access
EmployeeSchema.virtual("ssnDecrypted").get(function () {
  if (!this.ssn) return null
  try {
    return decryptSSN(this.ssn)
  } catch (error) {
    logger.error("Failed to decrypt SSN:", error)
    return null
  }
})

EmployeeSchema.virtual("ssnMasked").get(function () {
  if (!this.ssn) return null
  try {
    const decrypted = decryptSSN(this.ssn)
    return maskSSN(decrypted)
  } catch (error) {
    logger.error("Failed to mask SSN:", error)
    return "***-**-****"
  }
})

// Ensure virtuals are included in JSON output
EmployeeSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    // Remove the encrypted SSN from JSON output by default
    delete (ret as unknown as Record<string, unknown>).ssn
    return ret
  },
})

EmployeeSchema.set("toObject", { virtuals: true })

// Compound indexes for uniqueness and common queries
EmployeeSchema.index({ companyId: 1, email: 1 }, { unique: true })
EmployeeSchema.index({ companyId: 1, ssnHash: 1 }, { unique: true })
EmployeeSchema.index({ companyId: 1, employmentStatus: 1 })
EmployeeSchema.index({ "compensationHistory.effectiveDate": 1 })
EmployeeSchema.index({ "federalW4History.effectiveDate": 1 })

const Employee =
  (mongoose.models.Employee as Model<EmployeeDocument>) ||
  mongoose.model<EmployeeDocument>("Employee", EmployeeSchema)

export default Employee
