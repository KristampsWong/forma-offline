import { GetObjectCommand } from "@aws-sdk/client-s3"
import mongoose from "mongoose"

import { extractTransactionsFromPDF } from "@/lib/ai/extract-transactions"
import type { ExtractedTransactionRaw } from "@/lib/ai/extract-transactions"
import { COMPANY_ERRORS, EXPENSE_ERRORS, STATEMENT_IMPORT_ERRORS } from "@/lib/constants/errors"
import dbConnect from "@/lib/db/dbConnect"
import { parseToUTCMidnight } from "@/lib/date/utils"
import { createModuleLogger } from "@/lib/logger"
import { getS3Bucket, getS3Client } from "@/lib/s3/client"
import Company from "@/models/company"
import Expense from "@/models/expense"
import ExpenseCategory from "@/models/expense-category"
import StatementImport from "@/models/statement-import"

const log = createModuleLogger("extraction-service")

export async function extractStatementTransactions(
  userId: string,
  importId: string
): Promise<void> {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id").lean()
  if (!company) throw new Error(COMPANY_ERRORS.NOT_FOUND)

  const statementImport = await StatementImport.findOne({
    _id: importId,
    companyId: company._id,
  })
  if (!statementImport) throw new Error(STATEMENT_IMPORT_ERRORS.NOT_FOUND)

  if (statementImport.status !== "uploaded" && statementImport.status !== "failed") {
    throw new Error(STATEMENT_IMPORT_ERRORS.NOT_UPLOADED)
  }

  // Mark as extracting
  statementImport.status = "extracting"
  await statementImport.save()

  try {
    // 1. Fetch PDF from S3
    const s3Response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: getS3Bucket(),
        Key: statementImport.s3Key,
      })
    )

    const pdfBytes = Buffer.from(
      await s3Response.Body!.transformToByteArray()
    )

    log.info(`Fetched PDF from S3: ${statementImport.s3Key} (${pdfBytes.length} bytes)`)

    // 2. Fetch user's expense categories
    const categories = await ExpenseCategory.find({ companyId: company._id })
      .select("_id name")
      .lean<{ _id: string; name: string }[]>()

    log.info(`Found ${categories.length} expense categories`)

    // 3. Call AI extraction
    const rawTransactions = await extractTransactionsFromPDF(pdfBytes, categories, statementImport.fileName)

    // 4. Map categoryName → categoryId
    const categoryMap = new Map(
      categories.map((c) => [c.name.toLowerCase(), c._id.toString()])
    )

    const transactions = rawTransactions.map((t: ExtractedTransactionRaw) => {
      const matchedId = t.categoryName
        ? categoryMap.get(t.categoryName.toLowerCase())
        : undefined
      return {
        date: t.date,
        description: t.description,
        amount: t.amount,
        categoryId: matchedId
          ? new mongoose.Types.ObjectId(matchedId)
          : undefined,
        selected: true,
      }
    })

    // 5. Write to DB
    statementImport.transactions = transactions
    statementImport.status = "ready"
    await statementImport.save()

    log.info(
      `Extraction complete: ${transactions.length} transactions for import ${importId}`
    )
  } catch (error) {
    log.error(
      "Extraction failed",
      error instanceof Error ? error.message : error
    )

    statementImport.status = "failed"
    statementImport.error =
      error instanceof Error ? error.message : "Extraction failed"
    await statementImport.save()

    throw error
  }
}

export async function updateTransactionInImport(
  userId: string,
  importId: string,
  index: number,
  data: { date: string; categoryId: string; description: string; amount: string }
): Promise<void> {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id").lean()
  if (!company) throw new Error(COMPANY_ERRORS.NOT_FOUND)

  const statementImport = await StatementImport.findOne({
    _id: importId,
    companyId: company._id,
  })
  if (!statementImport) throw new Error(STATEMENT_IMPORT_ERRORS.NOT_FOUND)

  if (index < 0 || index >= statementImport.transactions.length) {
    throw new Error(STATEMENT_IMPORT_ERRORS.INVALID_TRANSACTION_INDEX)
  }

  const parsedDate = parseToUTCMidnight(data.date)
  if (!parsedDate) throw new Error(EXPENSE_ERRORS.INVALID_DATE)

  const amount = parseFloat(data.amount)
  if (isNaN(amount) || amount <= 0) throw new Error(EXPENSE_ERRORS.INVALID_AMOUNT)

  statementImport.transactions[index].date = data.date
  statementImport.transactions[index].description = data.description.trim()
  statementImport.transactions[index].amount = amount
  statementImport.transactions[index].categoryId = new mongoose.Types.ObjectId(data.categoryId)
  await statementImport.save()
}

export async function confirmStatementImportCore(
  userId: string,
  importId: string
): Promise<void> {
  await dbConnect()

  const company = await Company.findOne({ userId }).select("_id").lean()
  if (!company) throw new Error(COMPANY_ERRORS.NOT_FOUND)

  const statementImport = await StatementImport.findOne({
    _id: importId,
    companyId: company._id,
  })
  if (!statementImport) throw new Error(STATEMENT_IMPORT_ERRORS.NOT_FOUND)

  if (statementImport.status !== "ready") {
    throw new Error(STATEMENT_IMPORT_ERRORS.NOT_READY)
  }

  const expenses = statementImport.transactions.map((t) => ({
    companyId: company._id,
    categoryId: t.categoryId,
    date: parseToUTCMidnight(t.date),
    description: t.description,
    amount: t.amount,
    statementImportId: statementImport._id,
  }))

  await Expense.insertMany(expenses)

  statementImport.status = "confirmed"
  await statementImport.save()

  log.info(
    `Confirmed import ${importId}: created ${expenses.length} expenses`
  )
}
