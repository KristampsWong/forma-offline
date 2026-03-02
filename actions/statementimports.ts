"use server"

import { withAuth } from "@/lib/auth/auth-helpers"
import { COMPANY_ERRORS, STATEMENT_IMPORT_ERRORS } from "@/lib/constants/errors"
import dbConnect from "@/lib/db/dbConnect"
import { extractStatementTransactions } from "@/lib/services/expenses/extraction"
import Company from "@/models/company"
import ExpenseCategory from "@/models/expense-category"
import StatementImport from "@/models/statement-import"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { getS3Client, getS3Bucket } from "@/lib/s3/client"

export interface StatementImportListItem {
  _id: string
  fileName: string
  s3Key: string
  status: string
  createdAt: string
}

export async function getStatementImports() {
  return withAuth(async (userId) => {
    await dbConnect()

    const company = await Company.findOne({ userId }).select("_id").lean()
    if (!company) throw new Error(COMPANY_ERRORS.NOT_FOUND)

    const imports = await StatementImport.find({ companyId: company._id })
      .select("fileName s3Key status createdAt")
      .sort({ createdAt: -1 })
      .lean()

    return imports.map((doc): StatementImportListItem => ({
      _id: doc._id.toString(),
      fileName: doc.fileName,
      s3Key: doc.s3Key,
      status: doc.status,
      createdAt: doc.createdAt.toISOString(),
    }))
  })
}

export interface StatementImportDetail {
  _id: string
  fileName: string
  status: string
  presignedUrl: string
  transactions: StatementTransaction[]
}

export async function getStatementImportById(id: string) {
  return withAuth(async (userId) => {
    await dbConnect()

    const company = await Company.findOne({ userId }).select("_id").lean()
    if (!company) throw new Error(COMPANY_ERRORS.NOT_FOUND)

    const doc = await StatementImport.findOne({
      _id: id,
      companyId: company._id,
    }).lean()
    if (!doc) throw new Error(STATEMENT_IMPORT_ERRORS.NOT_FOUND)

    const command = new GetObjectCommand({
      Bucket: getS3Bucket(),
      Key: doc.s3Key,
    })
    const presignedUrl = await getSignedUrl(getS3Client(), command, {
      expiresIn: 900, // 15 minutes
    })

    // Resolve categoryId → categoryName for existing transactions
    const categoryIds = doc.transactions
      .map((t) => t.categoryId)
      .filter((cid): cid is NonNullable<typeof cid> => Boolean(cid))
    const categories =
      categoryIds.length > 0
        ? await ExpenseCategory.find({ _id: { $in: categoryIds } })
            .select("_id name")
            .lean()
        : []
    const categoryMap = new Map(
      categories.map((c) => [c._id.toString(), c.name])
    )

    const transactions: StatementTransaction[] = doc.transactions.map((t) => ({
      date: t.date,
      description: t.description,
      amount: t.amount,
      categoryName: t.categoryId
        ? categoryMap.get(t.categoryId.toString())
        : undefined,
      selected: t.selected,
    }))

    return {
      _id: doc._id.toString(),
      fileName: doc.fileName,
      status: doc.status,
      presignedUrl,
      transactions,
    } satisfies StatementImportDetail
  })
}

export interface StatementTransaction {
  date: string
  description: string
  amount: number
  categoryName?: string
  selected: boolean
}

export async function extractTransactions(importId: string) {
  return withAuth(async (userId) => {
    await extractStatementTransactions(userId, importId)

    // Return resolved transactions so the client can update without a page refresh
    const company = await Company.findOne({ userId }).select("_id").lean()
    if (!company) throw new Error(COMPANY_ERRORS.NOT_FOUND)

    const doc = await StatementImport.findOne({
      _id: importId,
      companyId: company._id,
    })
      .select("transactions")
      .lean()
    if (!doc) throw new Error(STATEMENT_IMPORT_ERRORS.NOT_FOUND)

    const categoryIds = doc.transactions
      .map((t) => t.categoryId)
      .filter((id): id is NonNullable<typeof id> => Boolean(id))
    const categories =
      categoryIds.length > 0
        ? await ExpenseCategory.find({ _id: { $in: categoryIds } })
            .select("_id name")
            .lean()
        : []
    const categoryMap = new Map(
      categories.map((c) => [c._id.toString(), c.name])
    )

    return doc.transactions.map(
      (t): StatementTransaction => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        categoryName: t.categoryId
          ? categoryMap.get(t.categoryId.toString())
          : undefined,
        selected: t.selected,
      })
    )
  })
}
