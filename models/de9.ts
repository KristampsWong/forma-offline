import mongoose, { Document, Model, Types } from "mongoose"

import { QUARTERS, type Quarter } from "@/types/quarter"

/**
 * DE-9 - Quarterly Contribution Return and Report of Wages
 *
 * California EDD quarterly form for reporting:
 * - UI, ETT, SDI contributions
 * - PIT withholding
 * - Subject wages
 */

// --- Types ---

export type De9Status = "computed" | "filed"

export interface IDe9HeaderData {
  quarterStarted: Date
  quarterEnded: Date
  due: Date
  delinquent: Date
  year: string
  quarter: string
}

export interface IDe9CompanyInfo {
  name: string
  address1: string
  address2: string
  employerAccountNumber: string
}

export interface IDe9FormData {
  fein: string
  additionalFeins: string[]
  uiRate: string
  uiTaxable: string
  uiContrib: string
  ettRate: string
  ettContrib: string
  sdiRate: string
  sdiTaxable: string
  sdiContrib: string
  subjectWages: string
  pitWithheld: string
  subtotal: string
  contributionsPaid: string
  totalDue: string
  outBusinessDate: string
}

export interface IDe9 {
  companyId: Types.ObjectId
  year: number
  quarter: Quarter
  headerData: IDe9HeaderData
  companyInfo: IDe9CompanyInfo
  formData: IDe9FormData
  status: De9Status
  filedAt?: Date
  filedBy?: string
  payrollIds?: Types.ObjectId[]
  computedAt: Date
  createdAt: Date
  updatedAt: Date
}

export type De9Document = IDe9 & Document

// --- Schemas ---

const De9Schema = new mongoose.Schema<De9Document>(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    quarter: {
      type: String,
      enum: QUARTERS,
      required: true,
    },
    headerData: {
      quarterStarted: { type: Date, required: true },
      quarterEnded: { type: Date, required: true },
      due: { type: Date, required: true },
      delinquent: { type: Date, required: true },
      year: { type: String, required: true },
      quarter: { type: String, required: true },
    },
    companyInfo: {
      name: { type: String, required: true },
      address1: { type: String, required: true },
      address2: { type: String, required: true },
      employerAccountNumber: { type: String, default: "" },
    },
    formData: {
      fein: { type: String, required: true },
      additionalFeins: { type: [String], default: [] },
      uiRate: { type: String, required: true },
      uiTaxable: { type: String, required: true },
      uiContrib: { type: String, required: true },
      ettRate: { type: String, required: true },
      ettContrib: { type: String, required: true },
      sdiRate: { type: String, required: true },
      sdiTaxable: { type: String, required: true },
      sdiContrib: { type: String, required: true },
      subjectWages: { type: String, required: true },
      pitWithheld: { type: String, required: true },
      subtotal: { type: String, required: true },
      contributionsPaid: { type: String, required: true },
      totalDue: { type: String, required: true },
      outBusinessDate: { type: String, default: "" },
    },
    payrollIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Payroll",
      default: [],
    },
    status: {
      type: String,
      enum: ["computed", "filed"],
      default: "computed",
      required: true,
    },
    filedAt: {
      type: Date,
    },
    filedBy: {
      type: String,
    },
    computedAt: {
      type: Date,
      default: () => new Date(),
      required: true,
    },
  },
  { timestamps: true },
)

De9Schema.index({ companyId: 1, year: 1, quarter: 1 }, { unique: true })

export default (mongoose.models.De9 as Model<De9Document>) ||
  mongoose.model<De9Document>("De9", De9Schema)
