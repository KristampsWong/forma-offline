import mongoose, { Document, Model } from "mongoose"

import type { CompanyType, PayFrequency } from "@/lib/constants/employment-constants"

// --- Types ---

export interface IPayFrequencyHistory {
  payFrequency: PayFrequency
  effectiveDate: Date
  changedBy?: string
  reason?: string
}

export interface IStateRate {
  state: string
  ETTRate: number
  UIRate: number
  eddAccountNumber?: string
  effectiveDate: Date
}

export interface IAddress {
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
}

export interface ICompany {
  name: string
  ein: string
  address: IAddress
  userId: string
  currentStateRate: IStateRate
  stateRatesHistory: IStateRate[]
  companyType: CompanyType
  payFrequency: PayFrequency
  payFrequencyHistory: IPayFrequencyHistory[]
  createdAt: Date
  updatedAt: Date
}

export type CompanyDocument = ICompany & Document

// --- Schemas ---

const PayFrequencyHistorySchema = new mongoose.Schema<IPayFrequencyHistory>({
  payFrequency: {
    type: String,
    enum: ["monthly"],
    required: true,
  },
  effectiveDate: {
    type: Date,
    required: true,
  },
  changedBy: {
    type: String,
    required: false,
  },
  reason: {
    type: String,
    required: false,
  },
})

const StateRateSchema = new mongoose.Schema<IStateRate>({
  state: {
    type: String,
    required: true,
    default: "CA",
  },
  ETTRate: {
    type: Number,
    required: true,
    default: 0.001,
  },
  UIRate: {
    type: Number,
    required: true,
    default: 0.034,
  },
  eddAccountNumber: {
    type: String,
    required: false,
    default: "",
  },
  effectiveDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
})

const CompanySchema = new mongoose.Schema<CompanyDocument>(
  {
    name: {
      type: String,
      required: true,
    },
    ein: {
      type: String,
      required: true,
    },
    address: {
      line1: {
        type: String,
        required: true,
      },
      line2: {
        type: String,
        required: false,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      zip: {
        type: String,
        required: true,
      },
    },
    userId: {
      type: String,
      required: true,
    },
    currentStateRate: {
      type: StateRateSchema,
      required: true,
      default: () => ({}),
    },
    stateRatesHistory: [StateRateSchema],
    companyType: {
      type: String,
      required: true,
      enum: ["llc", "corporation", "partnership", "sole_proprietorship"],
      default: "llc",
    },
    payFrequency: {
      type: String,
      enum: ["monthly"],
      required: true,
      default: "monthly",
    },
    payFrequencyHistory: [PayFrequencyHistorySchema],
  },
  {
    timestamps: true,
  },
)

CompanySchema.index(
  { userId: 1 },
  {
    unique: true,
    name: "unique_user_company",
  },
)

export default (mongoose.models.Company as Model<CompanyDocument>) ||
  mongoose.model<CompanyDocument>("Company", CompanySchema)
