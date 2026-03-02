import { NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"

import { requireAuth } from "@/lib/auth/auth-helpers"
import { COMPANY_ERRORS, STATEMENT_IMPORT_ERRORS } from "@/lib/constants/errors"
import dbConnect from "@/lib/db/dbConnect"
import { logger } from "@/lib/logger"
import { getS3Bucket, getS3Client } from "@/lib/s3/client"
import Company from "@/models/company"
import StatementImport from "@/models/statement-import"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: Request) {
  try {
    const { user } = await requireAuth()

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: STATEMENT_IMPORT_ERRORS.INVALID_FILE_TYPE },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: STATEMENT_IMPORT_ERRORS.FILE_TOO_LARGE },
        { status: 400 }
      )
    }

    await dbConnect()

    const company = await Company.findOne({ userId: user.id }).select("_id").lean()
    if (!company) {
      return NextResponse.json(
        { error: COMPANY_ERRORS.NOT_FOUND },
        { status: 404 }
      )
    }

    const companyId = company._id.toString()

    const s3Key = `statements/${companyId}/${crypto.randomUUID()}.pdf`

    const buffer = Buffer.from(await file.arrayBuffer())
    const s3 = getS3Client()

    await s3.send(
      new PutObjectCommand({
        Bucket: getS3Bucket(),
        Key: s3Key,
        Body: buffer,
        ContentType: "application/pdf",
      })
    )

    const importRecord = await StatementImport.create({
      companyId,
      fileName: file.name,
      s3Key,
      status: "uploaded",
      transactions: [],
    })

    return NextResponse.json({ importId: importRecord._id.toString() })
  } catch (error) {
    logger.error("Statement upload failed", error)
    return NextResponse.json(
      { error: STATEMENT_IMPORT_ERRORS.UPLOAD_FAILED },
      { status: 500 }
    )
  }
}
