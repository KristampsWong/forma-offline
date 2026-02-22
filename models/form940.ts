import mongoose, { Document, Model, Types } from "mongoose"

import type { Form940FilingStatus } from "@/lib/constants/tax-constants"

/**
 * Form 940 - Employer's Annual Federal Unemployment (FUTA) Tax Return
 *
 * This model stores the complete Form 940 data for each year.
 * FUTA tax is 6.0% on the first $7,000 of wages paid to each employee.
 * Most employers can claim a credit up to 5.4% for state unemployment taxes,
 * resulting in a net FUTA rate of 0.6%.
 */

// --- Types ---

export interface ICreditReductionState {
  state: string
  creditReductionRate: number
  wages: number
  creditReduction: number
}

export interface IReturnType {
  amended: boolean
  successor: boolean
  noPayments: boolean
  final: boolean
}

export interface IExemptPayments {
  fringe: number
  retirement: number
  dependent: number
  other: number
  total: number
}

export interface IQuarterlyLiability {
  q1: number
  q2: number
  q3: number
  q4: number
  total: number
}

export interface IThirdPartyDesignee {
  name: string
  phone: string
  pin: string
}

export interface IForm940 {
  companyId: Types.ObjectId

  // ===== Basic Information =====
  year: number
  periodStart: Date
  periodEnd: Date

  // ===== Part 1: Tell us about your return =====
  stateUnemploymentTaxStates: string[]
  isSubjectToCreditReduction: boolean
  creditReductionStates?: ICreditReductionState[]
  returnType: IReturnType

  // ===== Part 2: Determine your FUTA tax before adjustments =====
  line3_totalPaymentsToEmployees: number
  line4_exemptPayments: IExemptPayments
  line5_paymentsExceedingLimit: number
  line6_subtotal: number
  line7_totalTaxableFUTAWages: number
  line8_futaTaxBeforeAdjustments: number

  // ===== Part 3: Determine your adjustments =====
  line9_allWagesExcludedFromSUTA: boolean
  line9_adjustment: number
  line10_someWagesExcludedFromSUTA: boolean
  line10_excludedWages: number
  line10_adjustment: number
  line11_creditReduction: number
  line12_totalFUTATaxAfterAdjustments: number

  // ===== Part 4: Determine your FUTA tax and balance due or overpayment =====
  line13_futaTaxDeposited: number
  line14_balanceDue: number
  line15_overpayment: number
  applyOverpaymentToNextReturn: boolean

  // ===== Part 5: Report your FUTA tax liability by quarter =====
  quarterlyLiability?: IQuarterlyLiability

  // ===== Part 6: Third-party designee =====
  thirdPartyDesignee?: IThirdPartyDesignee

  // ===== Additional Fields =====
  payrollIds: Types.ObjectId[]
  filingStatus: Form940FilingStatus
  dueDate: Date
  filedDate?: Date
  confirmationNumber?: string
  paymentId?: Types.ObjectId
  isAmended: boolean
  amendedFrom?: Types.ObjectId
  amendmentReason?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export type Form940Document = IForm940 & Document

// --- Schemas ---

const Form940Schema = new mongoose.Schema<Form940Document>(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // Basic Information
    year: {
      type: Number,
      required: true,
      index: true,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },

    // Part 1
    stateUnemploymentTaxStates: {
      type: [String],
      required: true,
      default: [],
    },
    isSubjectToCreditReduction: {
      type: Boolean,
      default: false,
    },
    creditReductionStates: {
      type: [
        {
          state: { type: String, required: true },
          creditReductionRate: { type: Number, required: true },
          wages: { type: Number, required: true },
          creditReduction: { type: Number, required: true },
        },
      ],
      required: false,
    },
    returnType: {
      type: {
        amended: { type: Boolean, default: false },
        successor: { type: Boolean, default: false },
        noPayments: { type: Boolean, default: false },
        final: { type: Boolean, default: false },
      },
      required: true,
      default: {
        amended: false,
        successor: false,
        noPayments: false,
        final: false,
      },
    },

    // Part 2 - FUTA tax calculation
    line3_totalPaymentsToEmployees: {
      type: Number,
      required: true,
      default: 0,
    },
    line4_exemptPayments: {
      type: {
        fringe: { type: Number, default: 0 },
        retirement: { type: Number, default: 0 },
        dependent: { type: Number, default: 0 },
        other: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
      },
      required: true,
      default: {
        fringe: 0,
        retirement: 0,
        dependent: 0,
        other: 0,
        total: 0,
      },
    },
    line5_paymentsExceedingLimit: {
      type: Number,
      required: true,
      default: 0,
    },
    line6_subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    line7_totalTaxableFUTAWages: {
      type: Number,
      required: true,
      default: 0,
    },
    line8_futaTaxBeforeAdjustments: {
      type: Number,
      required: true,
      default: 0,
    },

    // Part 3 - Adjustments
    line9_allWagesExcludedFromSUTA: {
      type: Boolean,
      default: false,
    },
    line9_adjustment: {
      type: Number,
      default: 0,
    },
    line10_someWagesExcludedFromSUTA: {
      type: Boolean,
      default: false,
    },
    line10_excludedWages: {
      type: Number,
      default: 0,
    },
    line10_adjustment: {
      type: Number,
      default: 0,
    },
    line11_creditReduction: {
      type: Number,
      default: 0,
    },
    line12_totalFUTATaxAfterAdjustments: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },

    // Part 4 - Balance due or overpayment
    line13_futaTaxDeposited: {
      type: Number,
      default: 0,
    },
    line14_balanceDue: {
      type: Number,
      default: 0,
    },
    line15_overpayment: {
      type: Number,
      default: 0,
    },
    applyOverpaymentToNextReturn: {
      type: Boolean,
      default: false,
    },

    // Part 5 - Quarterly liability
    quarterlyLiability: {
      type: {
        q1: { type: Number, required: true },
        q2: { type: Number, required: true },
        q3: { type: Number, required: true },
        q4: { type: Number, required: true },
        total: { type: Number, required: true },
      },
      required: false,
    },

    // Part 6 - Third-party designee
    thirdPartyDesignee: {
      type: {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        pin: { type: String, required: true },
      },
      required: false,
    },

    // Related records
    payrollIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payroll",
      },
    ],

    // Filing status
    filingStatus: {
      type: String,
      enum: ["draft", "ready_to_file", "filed", "amended"],
      default: "draft",
      index: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    filedDate: {
      type: Date,
      required: false,
    },
    confirmationNumber: {
      type: String,
      required: false,
    },

    // Payment reference
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FederalFUTAPayment",
      required: false,
    },

    // Amendment tracking
    isAmended: {
      type: Boolean,
      default: false,
    },
    amendedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form940",
      required: false,
    },
    amendmentReason: {
      type: String,
      required: false,
    },

    // Notes
    notes: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  },
)

// Unique constraint: One 940 form per company per year
Form940Schema.index({ companyId: 1, year: 1 }, { unique: true })

// Query by year and filing status
Form940Schema.index({ companyId: 1, year: -1, filingStatus: 1 })

// Query by period dates
Form940Schema.index({ companyId: 1, periodStart: 1, periodEnd: 1 })

export default (mongoose.models.Form940 as Model<Form940Document>) ||
  mongoose.model<Form940Document>("Form940", Form940Schema)
