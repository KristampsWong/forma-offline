import mongoose, { type Document, type Model, Schema, type Types } from "mongoose"

export interface IExpenseCategory {
  companyId: Types.ObjectId
  name: string
  createdAt: Date
  updatedAt: Date
}

export type ExpenseCategoryDocument = IExpenseCategory & Document

const ExpenseCategorySchema = new Schema<ExpenseCategoryDocument>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
)

// Unique compound index: no duplicate category names per company
ExpenseCategorySchema.index({ companyId: 1, name: 1 }, { unique: true })

const ExpenseCategory =
  (mongoose.models.ExpenseCategory as Model<ExpenseCategoryDocument>) ||
  mongoose.model<ExpenseCategoryDocument>("ExpenseCategory", ExpenseCategorySchema)

export default ExpenseCategory