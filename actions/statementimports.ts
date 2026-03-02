"use server"

import { withAuth } from "@/lib/auth/auth-helpers"
import { COMPANY_ERRORS } from "@/lib/constants/errors"
import dbConnect from "@/lib/db/dbConnect"
import Company from "@/models/company"
import StatementImport from "@/models/statement-import"

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
