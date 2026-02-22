import mongoose, { Document, Model, Types } from "mongoose"

import type { Form941FilingStatus } from "@/lib/constants/tax-constants"
import { QUARTERS, type Quarter } from "@/types/quarter"

/**
 * Form 941 - Employer's Quarterly Federal Tax Return
 *
 * This model stores the complete Form 941 data for each quarter.
 * Used to track historical 941 data for calculating:
 * - Line 16: Total taxes after adjustments and credits (cumulative for the year)
 * - Quarter-over-quarter tax liability tracking
 */

// --- Types ---

export interface IMonthlyTaxLiability {
  month1: number
  month2: number
  month3: number
  total: number
}

export interface IScheduleB {
  totalLiability: number
}

export interface IForm941 {
  companyId: Types.ObjectId

  // ===== Part 1: Basic Information =====
  quarter: Quarter
  year: number
  periodStart: Date
  periodEnd: Date

  // ===== Part 2: Tax Calculation =====
  // Line 1: Number of employees who received wages
  numberOfEmployees: number

  // Line 2: Wages, tips, and other compensation
  totalWages: number

  // Line 3: Federal income tax withheld
  federalIncomeTaxWithheld: number

  // Line 4: If no wages, tips, and other compensation are subject to social security or Medicare tax
  taxableWagesNotSubjectToSSMedicare: boolean

  // Line 5: Taxable social security and Medicare wages
  line5a_socialSecurityWages: number
  line5a_socialSecurityTax: number // Column 1 × 0.124 = Column 2
  line5b_socialSecurityTips: number
  line5b_socialSecurityTipsTax: number

  line5c_medicareWagesTips: number
  line5c_medicareTax: number // Column 1 × 0.029 = Column 2

  line5d_medicareWagesTipsSubjectToAdditional: number
  line5d_additionalMedicareTax: number // Column 1 × 0.009 = Column 2

  line5e_totalSocialSecurityMedicareTax: number // Add Column 2 lines 5a, 5a(i), 5b, and 5c

  // Line 6: Section 3121(q) Notice and Demand (rare, usually 0)
  line5f_section3121qNoticeDemand: number

  // Line 7: Current quarter's adjustment for tips (rare, usually 0)
  currentQuarterTipsAdjustment: number

  // Line 8: Current quarter's adjustment for group-term life insurance (rare, usually 0)
  currentQuarterGroupTermLifeInsuranceAdjustment: number

  // Line 9: Current quarter's adjustments (rare, usually 0)
  currentQuarterAdjustments: number

  // Line 10: Total taxes before adjustments (line 3 + line 5d + line 6 + line 7 + line 8 + line 9)
  totalTaxesBeforeAdjustments: number

  // Line 11: Qualified small business payroll tax credit for increasing research activities
  qualifiedSmallBusinessPayrollTaxCredit: number

  // Line 12: Total taxes after adjustments and credits
  totalTaxesAfterAdjustmentsAndCredits: number

  // Line 13: Total deposits for this quarter
  totalDepositsForQuarter: number

  // Line 14: Balance due or overpayment
  balanceDue: number
  overpayment: number

  // Line 15: Apply overpayment to next return or request refund
  applyOverpaymentToNextReturn: boolean

  // ===== Part 3: Monthly Summary of Federal Tax Liability =====
  monthlyTaxLiability?: IMonthlyTaxLiability

  // ===== Part 4: Semiweekly Schedule Depositor =====
  isSemiweeklyScheduleDepositor: boolean
  scheduleB?: IScheduleB

  // ===== Additional Fields =====
  payrollIds: Types.ObjectId[]
  filingStatus: Form941FilingStatus
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

export type Form941Document = IForm941 & Document

// --- Schemas ---

const Form941Schema = new mongoose.Schema<Form941Document>(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // Basic Information
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
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },

    // Tax Calculation
    numberOfEmployees: {
      type: Number,
      required: true,
      default: 0,
    },
    totalWages: {
      type: Number,
      required: true,
      default: 0,
    },
    federalIncomeTaxWithheld: {
      type: Number,
      required: true,
      default: 0,
    },
    taxableWagesNotSubjectToSSMedicare: {
      type: Boolean,
      default: false,
    },

    // Line 5 - Social Security and Medicare
    line5a_socialSecurityWages: {
      type: Number,
      required: true,
      default: 0,
    },
    line5a_socialSecurityTax: {
      type: Number,
      required: true,
      default: 0,
    },
    line5b_socialSecurityTips: {
      type: Number,
      default: 0,
    },
    line5b_socialSecurityTipsTax: {
      type: Number,
      default: 0,
    },
    line5c_medicareWagesTips: {
      type: Number,
      required: true,
      default: 0,
    },
    line5c_medicareTax: {
      type: Number,
      required: true,
      default: 0,
    },
    line5d_medicareWagesTipsSubjectToAdditional: {
      type: Number,
      default: 0,
    },
    line5d_additionalMedicareTax: {
      type: Number,
      default: 0,
    },
    line5e_totalSocialSecurityMedicareTax: {
      type: Number,
      required: true,
      default: 0,
    },

    line5f_section3121qNoticeDemand: {
      type: Number,
      default: 0,
    },
    // Line 6-9 - Adjustments
    currentQuarterTipsAdjustment: {
      type: Number,
      default: 0,
    },
    currentQuarterGroupTermLifeInsuranceAdjustment: {
      type: Number,
      default: 0,
    },
    currentQuarterAdjustments: {
      type: Number,
      default: 0,
    },

    // Line 10-12 - Total Taxes
    totalTaxesBeforeAdjustments: {
      type: Number,
      required: true,
      default: 0,
    },
    qualifiedSmallBusinessPayrollTaxCredit: {
      type: Number,
      default: 0,
    },
    totalTaxesAfterAdjustmentsAndCredits: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },

    // Line 13-15 - Deposits and Balance
    totalDepositsForQuarter: {
      type: Number,
      default: 0,
    },
    balanceDue: {
      type: Number,
      default: 0,
    },
    overpayment: {
      type: Number,
      default: 0,
    },
    applyOverpaymentToNextReturn: {
      type: Boolean,
      default: false,
    },

    // Monthly Summary
    monthlyTaxLiability: {
      type: {
        month1: { type: Number, required: true },
        month2: { type: Number, required: true },
        month3: { type: Number, required: true },
        total: { type: Number, required: true },
      },
      required: false,
    },

    // Semiweekly Schedule
    isSemiweeklyScheduleDepositor: {
      type: Boolean,
      default: false,
    },
    scheduleB: {
      type: {
        totalLiability: { type: Number, required: true },
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
      ref: "Federal941Payment",
      required: false,
    },

    // Amendment tracking
    isAmended: {
      type: Boolean,
      default: false,
    },
    amendedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form941",
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

// Unique constraint: One 941 form per company per quarter per year
Form941Schema.index({ companyId: 1, year: 1, quarter: 1 }, { unique: true })

// Query by year and filing status
Form941Schema.index({ companyId: 1, year: -1, filingStatus: 1 })

// Query by period dates
Form941Schema.index({ companyId: 1, periodStart: 1, periodEnd: 1 })

export default (mongoose.models.Form941 as Model<Form941Document>) ||
  mongoose.model<Form941Document>("Form941", Form941Schema)
