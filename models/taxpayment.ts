import mongoose, { Document, Model, Types } from "mongoose"

import { QUARTERS, type Quarter } from "@/types/quarter"

/**
 * Tax Payment Models
 *
 * Stores tax payment records for each payment obligation:
 * - Federal941Payment: Quarterly payroll tax (income tax + FICA)
 * - Federal940Payment: Quarterly FUTA deposits
 * - CAPitSdiPayment: CA personal income tax + SDI withholding
 * - CASuiEttPayment: CA state unemployment insurance + employment training tax
 */

// --- Types ---

export type TaxPaymentStatus = "pending" | "paid"

// ===== Federal 941 Payment (Quarterly Payroll Tax) =====

export interface IFederal941Payment {
  companyId: Types.ObjectId
  periodStart: Date
  periodEnd: Date
  quarter: Quarter
  year: number
  federalIncomeTax: number
  socialSecurityTax: number
  socialSecurityEmployerTax: number
  medicareTax: number
  medicareEmployerTax: number
  totalTax: number
  dueDate: Date
  status: TaxPaymentStatus
  paidDate?: Date
  paymentMethod?: string
  confirmationNumber?: string
  payrollIds: Types.ObjectId[]
  notes?: string
  requiresImmediatePayment: boolean
  createdAt: Date
  updatedAt: Date
}

export type Federal941PaymentDocument = IFederal941Payment & Document

// ===== Federal 940 Payment (FUTA - Quarterly Deposits) =====

export interface IFederal940Payment {
  companyId: Types.ObjectId
  periodStart: Date
  periodEnd: Date
  quarter?: Quarter
  year: number
  futaEmployer: number
  totalTax: number
  dueDate: Date
  status: TaxPaymentStatus
  paidDate?: Date
  paymentMethod?: string
  confirmationNumber?: string
  payrollIds: Types.ObjectId[]
  notes?: string
  requiresImmediatePayment: boolean
  createdAt: Date
  updatedAt: Date
}

export type Federal940PaymentDocument = IFederal940Payment & Document

// ===== CA PIT/SDI Payment (Personal Income Tax + State Disability Insurance) =====

export interface ICAPitSdiPayment {
  companyId: Types.ObjectId
  periodStart: Date
  periodEnd: Date
  quarter: Quarter
  year: number
  caIncomeTax: number
  caStateDisabilityIns: number
  totalTax: number
  dueDate: Date
  status: TaxPaymentStatus
  paidDate?: Date
  paymentMethod?: string
  confirmationNumber?: string
  payrollIds: Types.ObjectId[]
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export type CAPitSdiPaymentDocument = ICAPitSdiPayment & Document

// ===== CA SUI/ETT Payment (State Unemployment Insurance + Employment Training Tax) =====

export interface ICASuiEttPayment {
  companyId: Types.ObjectId
  periodStart: Date
  periodEnd: Date
  quarter: Quarter
  year: number
  caSuiEmployer: number
  caEtt: number
  totalTax: number
  dueDate: Date
  status: TaxPaymentStatus
  paidDate?: Date
  paymentMethod?: string
  confirmationNumber?: string
  payrollIds: Types.ObjectId[]
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export type CASuiEttPaymentDocument = ICASuiEttPayment & Document

// --- Schemas ---

const Federal941PaymentSchema = new mongoose.Schema<Federal941PaymentDocument>(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    periodStart: {
      type: Date,
      required: true,
      index: true,
    },
    periodEnd: {
      type: Date,
      required: true,
      index: true,
    },
    quarter: {
      type: String,
      enum: QUARTERS,
      required: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    federalIncomeTax: {
      type: Number,
      required: true,
      default: 0,
    },
    socialSecurityTax: {
      type: Number,
      required: true,
      default: 0,
    },
    socialSecurityEmployerTax: {
      type: Number,
      required: true,
      default: 0,
    },
    medicareTax: {
      type: Number,
      required: true,
      default: 0,
    },
    medicareEmployerTax: {
      type: Number,
      required: true,
      default: 0,
    },
    totalTax: {
      type: Number,
      required: true,
      default: 0,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
      index: true,
    },
    paidDate: {
      type: Date,
      required: false,
    },
    paymentMethod: {
      type: String,
      required: false,
    },
    confirmationNumber: {
      type: String,
      required: false,
    },
    payrollIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payroll",
      },
    ],
    notes: {
      type: String,
      required: false,
    },
    requiresImmediatePayment: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

const Federal940PaymentSchema = new mongoose.Schema<Federal940PaymentDocument>(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    periodStart: {
      type: Date,
      required: true,
      index: true,
    },
    periodEnd: {
      type: Date,
      required: true,
      index: true,
    },
    quarter: {
      type: String,
      enum: QUARTERS,
      required: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    futaEmployer: {
      type: Number,
      required: true,
      default: 0,
    },
    totalTax: {
      type: Number,
      required: true,
      default: 0,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
      index: true,
    },
    paidDate: {
      type: Date,
      required: false,
    },
    paymentMethod: {
      type: String,
      required: false,
    },
    confirmationNumber: {
      type: String,
      required: false,
    },
    payrollIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payroll",
      },
    ],
    notes: {
      type: String,
      required: false,
    },
    requiresImmediatePayment: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

const CAPitSdiPaymentSchema = new mongoose.Schema<CAPitSdiPaymentDocument>(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    periodStart: {
      type: Date,
      required: true,
      index: true,
    },
    periodEnd: {
      type: Date,
      required: true,
      index: true,
    },
    quarter: {
      type: String,
      enum: QUARTERS,
      required: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    caIncomeTax: {
      type: Number,
      required: true,
      default: 0,
    },
    caStateDisabilityIns: {
      type: Number,
      required: true,
      default: 0,
    },
    totalTax: {
      type: Number,
      required: true,
      default: 0,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
      index: true,
    },
    paidDate: {
      type: Date,
      required: false,
    },
    paymentMethod: {
      type: String,
      required: false,
    },
    confirmationNumber: {
      type: String,
      required: false,
    },
    payrollIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payroll",
      },
    ],
    notes: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  },
)

const CASuiEttPaymentSchema = new mongoose.Schema<CASuiEttPaymentDocument>(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    periodStart: {
      type: Date,
      required: true,
      index: true,
    },
    periodEnd: {
      type: Date,
      required: true,
      index: true,
    },
    quarter: {
      type: String,
      enum: QUARTERS,
      required: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    caSuiEmployer: {
      type: Number,
      required: true,
      default: 0,
    },
    caEtt: {
      type: Number,
      required: true,
      default: 0,
    },
    totalTax: {
      type: Number,
      required: true,
      default: 0,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
      index: true,
    },
    paidDate: {
      type: Date,
      required: false,
    },
    paymentMethod: {
      type: String,
      required: false,
    },
    confirmationNumber: {
      type: String,
      required: false,
    },
    payrollIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payroll",
      },
    ],
    notes: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes

// Federal941Payment: monthly payments keyed by period range
Federal941PaymentSchema.index(
  { companyId: 1, periodStart: 1, periodEnd: 1 },
  { unique: true },
)
Federal941PaymentSchema.index({ companyId: 1, year: -1, quarter: 1 })
Federal941PaymentSchema.index({ status: 1, dueDate: 1 })

// Federal940Payment: quarterly payments keyed by year + quarter
Federal940PaymentSchema.index(
  { companyId: 1, year: 1, quarter: 1 },
  { unique: true },
)
Federal940PaymentSchema.index({ status: 1, dueDate: 1 })

// CAPitSdiPayment: monthly payments keyed by period range
CAPitSdiPaymentSchema.index(
  { companyId: 1, periodStart: 1, periodEnd: 1 },
  { unique: true },
)
CAPitSdiPaymentSchema.index({ companyId: 1, year: -1, quarter: 1 })
CAPitSdiPaymentSchema.index({ status: 1, dueDate: 1 })

// CASuiEttPayment: quarterly payments keyed by year + quarter
CASuiEttPaymentSchema.index(
  { companyId: 1, year: 1, quarter: 1 },
  { unique: true },
)
CASuiEttPaymentSchema.index({ status: 1, dueDate: 1 })

// Middleware: auto-calculate totals on save
Federal941PaymentSchema.pre("save", function () {
  this.totalTax =
    this.federalIncomeTax +
    this.socialSecurityTax +
    this.socialSecurityEmployerTax +
    this.medicareTax +
    this.medicareEmployerTax
})

Federal940PaymentSchema.pre("save", function () {
  this.totalTax = this.futaEmployer
})

CAPitSdiPaymentSchema.pre("save", function () {
  this.totalTax = this.caIncomeTax + this.caStateDisabilityIns
})

CASuiEttPaymentSchema.pre("save", function () {
  this.totalTax = this.caSuiEmployer + this.caEtt
})

// Export models
export const Federal941Payment =
  (mongoose.models.Federal941Payment as Model<Federal941PaymentDocument>) ||
  mongoose.model<Federal941PaymentDocument>(
    "Federal941Payment",
    Federal941PaymentSchema,
  )

export const Federal940Payment =
  (mongoose.models.Federal940Payment as Model<Federal940PaymentDocument>) ||
  mongoose.model<Federal940PaymentDocument>(
    "Federal940Payment",
    Federal940PaymentSchema,
  )

export const CAPitSdiPayment =
  (mongoose.models.CAPitSdiPayment as Model<CAPitSdiPaymentDocument>) ||
  mongoose.model<CAPitSdiPaymentDocument>(
    "CAPitSdiPayment",
    CAPitSdiPaymentSchema,
  )

export const CASuiEttPayment =
  (mongoose.models.CASuiEttPayment as Model<CASuiEttPaymentDocument>) ||
  mongoose.model<CASuiEttPaymentDocument>(
    "CASuiEttPayment",
    CASuiEttPaymentSchema,
  )

export default Federal941Payment
