import mongoose, { Document, Model, Types } from "mongoose"

import { QUARTERS, type Quarter } from "@/types/quarter"

/**
 * DE-9C - Quarterly Contribution Return and Report of Wages (Continuation)
 *
 * California EDD quarterly form for reporting individual employee wages:
 * - Employee SSN, name, wages
 * - PIT wages and withholding per employee
 * - Monthly employee counts
 */

// --- Types ---

export type De9cStatus = "computed" | "filed"

export interface IDe9cEmployee {
  ssn: string
  firstName: string
  mi?: string
  lastName: string
  totalSubjectWages: string
  totalPitWages: string
  totalPitWithheld: string
  wageCode: string
}

export interface IDe9cHeaderData {
  quarterEnded: Date
  due: Date
  delinquent: Date
  year: string
  quarter: string
}

export interface IDe9cCompanyInfo {
  name: string
  address1: string
  address2: string
  employerAccountNumber: string
}

export interface IDe9cEmployeeCounts {
  month1: number
  month2: number
  month3: number
}

export interface IDe9cGrandTotals {
  totalSubjectWages: string
  totalPitWages: string
  totalPitWithheld: string
}

export interface IDe9c {
  companyId: Types.ObjectId
  year: number
  quarter: Quarter
  headerData: IDe9cHeaderData
  companyInfo: IDe9cCompanyInfo
  employees: IDe9cEmployee[]
  employeeCounts: IDe9cEmployeeCounts
  grandTotals: IDe9cGrandTotals
  status: De9cStatus
  filedAt?: Date
  filedBy?: string
  payrollIds?: Types.ObjectId[]
  computedAt: Date
  createdAt: Date
  updatedAt: Date
}

export type De9cDocument = IDe9c & Document

// --- Schemas ---

const De9cEmployeeSchema = new mongoose.Schema<IDe9cEmployee>(
  {
    ssn: { type: String, required: true },
    firstName: { type: String, required: true },
    mi: { type: String, default: "" },
    lastName: { type: String, required: true },
    totalSubjectWages: { type: String, required: true },
    totalPitWages: { type: String, required: true },
    totalPitWithheld: { type: String, required: true },
    wageCode: { type: String, required: true, default: "S" },
  },
  { _id: false },
)

const De9cSchema = new mongoose.Schema<De9cDocument>(
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
    employees: {
      type: [De9cEmployeeSchema],
      required: true,
      default: [],
    },
    employeeCounts: {
      month1: { type: Number, required: true, default: 0 },
      month2: { type: Number, required: true, default: 0 },
      month3: { type: Number, required: true, default: 0 },
    },
    grandTotals: {
      totalSubjectWages: { type: String, required: true, default: "0.00" },
      totalPitWages: { type: String, required: true, default: "0.00" },
      totalPitWithheld: { type: String, required: true, default: "0.00" },
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

De9cSchema.index({ companyId: 1, year: 1, quarter: 1 }, { unique: true })

export default (mongoose.models.De9c as Model<De9cDocument>) ||
  mongoose.model<De9cDocument>("De9c", De9cSchema)
