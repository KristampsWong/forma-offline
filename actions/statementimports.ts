"use server"

import { withAuth } from "@/lib/auth/auth-helpers"
import { COMPANY_ERRORS, STATEMENT_IMPORT_ERRORS } from "@/lib/constants/errors"
import dbConnect from "@/lib/db/dbConnect"
import { extractStatementTransactions } from "@/lib/services/expenses/extraction"
import Company from "@/models/company"
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

    return {
      _id: doc._id.toString(),
      fileName: doc.fileName,
      status: doc.status,
      presignedUrl,
    } satisfies StatementImportDetail
  })
}

export async function extractTransactions(importId: string) {
  return withAuth(async (userId) => {
    await extractStatementTransactions(userId, importId)
    return { importId }
  })
}
