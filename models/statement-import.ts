import mongoose, { type Document, type Model, Schema, type Types } from "mongoose"

export interface IExtractedTransaction {
  date: string
  description: string
  amount: number
  categoryId?: Types.ObjectId
  selected: boolean
}

export interface IStatementImport {
  companyId: Types.ObjectId
  fileName: string
  s3Key: string
  status: "uploaded" | "extracting" | "ready" | "confirmed" | "failed"
  transactions: IExtractedTransaction[]
  error?: string
  createdAt: Date
  updatedAt: Date
}

export type StatementImportDocument = IStatementImport & Document

const ExtractedTransactionSchema = new Schema<IExtractedTransaction>(
  {
    date: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "ExpenseCategory" },
    selected: { type: Boolean, default: true },
  },
  { _id: false }
)

const StatementImportSchema = new Schema<StatementImportDocument>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    s3Key: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["uploaded", "extracting", "ready", "confirmed", "failed"],
      default: "uploaded",
    },
    transactions: [ExtractedTransactionSchema],
    error: {
      type: String,
    },
  },
  { timestamps: true }
)

StatementImportSchema.index({ companyId: 1, createdAt: -1 })

const StatementImport =
  (mongoose.models.StatementImport as Model<StatementImportDocument>) ||
  mongoose.model<StatementImportDocument>("StatementImport", StatementImportSchema)

export default StatementImport
