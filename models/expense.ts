import mongoose, { type Document, type Model, Schema, type Types } from "mongoose"

export interface IExpense {
  companyId: Types.ObjectId
  categoryId: Types.ObjectId
  date: Date
  description: string
  amount: number
  vendor?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export type ExpenseDocument = IExpense & Document

const ExpenseSchema = new Schema<ExpenseDocument>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    vendor: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
)

// Compound index for date-range queries per company
ExpenseSchema.index({ companyId: 1, date: -1 })

const Expense =
  (mongoose.models.Expense as Model<ExpenseDocument>) ||
  mongoose.model<ExpenseDocument>("Expense", ExpenseSchema)

export default Expense