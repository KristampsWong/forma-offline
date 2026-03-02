# Statement Import Phase 1: Models & S3 Upload — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add data models and S3 upload for bank statement import (no AI extraction or review UI yet).

**Architecture:** Add `StatementImport` Mongoose model, add optional `statementImportId` ref to `Expense`, create S3 upload API route, and wire the existing upload dialog to upload PDFs and navigate to an import page.

**Tech Stack:** Mongoose, AWS SDK v3 (`@aws-sdk/client-s3`), Next.js API routes, React

---

### Task 1: Install `@aws-sdk/client-s3`

**Step 1: Install dependency**

Run: `pnpm add @aws-sdk/client-s3`

**Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @aws-sdk/client-s3 for S3 uploads"
```

---

### Task 2: Add "Other" to default expense categories

**Files:**
- Modify: `actions/company.ts:18-29`

**Step 1: Add "Other" to the array**

In `actions/company.ts`, add `"Other"` as the last item in `DEFAULT_EXPENSE_CATEGORIES`:

```ts
const DEFAULT_EXPENSE_CATEGORIES = [
  "Office Supplies",
  "Software & Subscriptions",
  "Travel",
  "Meals & Entertainment",
  "Professional Services",
  "Utilities",
  "Rent",
  "Insurance",
  "Marketing & Advertising",
  "Equipment",
  "Other",
]
```

**Step 2: Commit**

```bash
git add actions/company.ts
git commit -m "feat: add Other to default expense categories"
```

---

### Task 3: Add `statementImportId` to Expense model

**Files:**
- Modify: `models/expense.ts`

**Step 1: Add the optional field to `IExpense` interface**

Add after the `notes` field:

```ts
statementImportId?: Types.ObjectId
```

**Step 2: Add the field to the schema**

Add after the `notes` schema field:

```ts
statementImportId: {
  type: Schema.Types.ObjectId,
  ref: "StatementImport",
},
```

No `required: true` — this is optional. Only set when an expense is created from a statement import.

**Step 3: Verify build**

Run: `pnpm run build`
Expected: Build succeeds (model change is additive, no breaking changes)

**Step 4: Commit**

```bash
git add models/expense.ts
git commit -m "feat: add optional statementImportId ref to Expense model"
```

---

### Task 4: Create `StatementImport` model

**Files:**
- Create: `models/statement-import.ts`

**Step 1: Create the model file**

```ts
import mongoose, { type Document, type Model, Schema, type Types } from "mongoose"

export interface IExtractedTransaction {
  date: string
  description: string
  amount: number
  type: "debit" | "credit"
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
    type: { type: String, enum: ["debit", "credit"], required: true },
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
```

**Step 2: Verify build**

Run: `pnpm run build`

**Step 3: Commit**

```bash
git add models/statement-import.ts
git commit -m "feat: add StatementImport model"
```

---

### Task 5: Add error constants for statement import

**Files:**
- Modify: `lib/constants/errors.ts`

**Step 1: Add `STATEMENT_IMPORT_ERRORS` block**

Add before `GENERIC_ERRORS`:

```ts
/**
 * Statement Import Errors
 */
export const STATEMENT_IMPORT_ERRORS = {
  NOT_FOUND: "Statement import not found",
  INVALID_FILE_TYPE: "Only PDF files are accepted",
  FILE_TOO_LARGE: "File size must be under 10MB",
  UPLOAD_FAILED: "Failed to upload file",
  ALREADY_CONFIRMED: "This import has already been confirmed",
} as const
```

**Step 2: Add to `ERRORS` combined export**

Add `STATEMENT_IMPORT: STATEMENT_IMPORT_ERRORS` to the `ERRORS` object.

**Step 3: Commit**

```bash
git add lib/constants/errors.ts
git commit -m "feat: add statement import error constants"
```

---

### Task 6: Create S3 client singleton

**Files:**
- Create: `lib/s3/client.ts`

**Step 1: Create the S3 client**

```ts
import { S3Client } from "@aws-sdk/client-s3"

let client: S3Client | null = null

export function getS3Client(): S3Client {
  if (!client) {
    client = new S3Client({
      region: process.env.AWS_S3_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }
  return client
}

export function getS3Bucket(): string {
  return process.env.AWS_S3_BUCKET!
}
```

**Step 2: Add env vars to `.env.example`**

Append to the end of `.env.example`:

```
# AWS S3 (Statement Upload)
AWS_S3_BUCKET=
AWS_S3_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

**Step 3: Commit**

```bash
git add lib/s3/client.ts .env.example
git commit -m "feat: add S3 client singleton and env vars"
```

---

### Task 7: Create the upload API route

**Files:**
- Create: `app/api/upload/statement/route.ts`

**Step 1: Create the API route**

```ts
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

    // Create the import record first to get the ID for the S3 key
    const importRecord = await StatementImport.create({
      companyId,
      fileName: file.name,
      s3Key: "", // will be set after we know the ID
      status: "uploaded",
      transactions: [],
    })

    const s3Key = `statements/${companyId}/${importRecord._id.toString()}.pdf`

    // Upload to S3
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

    // Update the record with the S3 key
    importRecord.s3Key = s3Key
    await importRecord.save()

    return NextResponse.json({ importId: importRecord._id.toString() })
  } catch (error) {
    logger.error("Statement upload failed", error)
    return NextResponse.json(
      { error: STATEMENT_IMPORT_ERRORS.UPLOAD_FAILED },
      { status: 500 }
    )
  }
}
```

**Step 2: Verify build**

Run: `pnpm run build`

**Step 3: Commit**

```bash
git add app/api/upload/statement/route.ts
git commit -m "feat: add POST /api/upload/statement API route"
```

---

### Task 8: Wire up the upload dialog

**Files:**
- Modify: `components/expenses/upload-files/upload-expense-dialog.tsx`

**Step 1: Update the dialog to call the API and navigate**

Replace the placeholder `handleUpload` with real upload logic. Key changes:
- Add `useRouter` for navigation
- Add `isUploading` loading state
- `handleUpload` sends each file as FormData to `/api/upload/statement`
- On success, navigate to `/expenses/import?id={importId}`
- On error, show toast
- Disable buttons during upload

```tsx
"use client"

import { FileUp, Loader2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useRef, useState } from "react"
import type { DragEvent } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface UploadExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UploadExpenseDialog({
  open,
  onOpenChange,
}: UploadExpenseDialogProps) {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return
    const pdfs = Array.from(newFiles).filter(
      (f) => f.type === "application/pdf"
    )
    if (pdfs.length < newFiles.length) {
      toast.error("Only PDF files are accepted")
    }
    setFiles((prev) => [...prev, ...pdfs])
  }, [])

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setIsUploading(true)

    try {
      // Upload the first file (single statement at a time)
      const formData = new FormData()
      formData.append("file", files[0])

      const res = await fetch("/api/upload/statement", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Upload failed")
      }

      const { importId } = await res.json()

      toast.success("Statement uploaded successfully")
      setFiles([])
      onOpenChange(false)
      router.push(`/expenses/import?id=${importId}`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload failed"
      )
    } finally {
      setIsUploading(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (isUploading) return
    if (!nextOpen) setFiles([])
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Bank Statement</DialogTitle>
          <DialogDescription>
            Upload a PDF bank statement to extract and import transactions.
          </DialogDescription>
        </DialogHeader>

        <div
          role="button"
          tabIndex={0}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            isUploading && "pointer-events-none opacity-50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
          }}
        >
          <FileUp className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag & drop a PDF bank statement here, or click to browse
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ""
            }}
          />
        </div>

        {files.length > 0 && (
          <ul className="space-y-2">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span className="truncate">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  onClick={() => removeFile(i)}
                  disabled={isUploading}
                >
                  <X className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>Upload {files.length > 0 && `(${files.length})`}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

Note: Changed from `multiple` to single file input since we process one statement at a time. The `files` array state is kept for the list UI but only the first file is uploaded.

**Step 2: Verify build**

Run: `pnpm run build`

**Step 3: Commit**

```bash
git add components/expenses/upload-files/upload-expense-dialog.tsx
git commit -m "feat: wire upload dialog to S3 upload API with navigation"
```

---

### Task 9: Create placeholder import page

**Files:**
- Create: `app/(dashboard)/expenses/import/page.tsx`

**Step 1: Create a minimal placeholder page**

This page will be fully built in Phase 2 (AI extraction + editable table). For now, just confirm the route works and shows the import ID.

```tsx
import Header from "@/components/header"

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>
}) {
  const { id } = await searchParams

  if (!id) {
    return (
      <main className="p-4 max-w-7xl mx-auto space-y-8 w-full">
        <Header title="Import Transactions" />
        <p className="text-muted-foreground">No import ID provided.</p>
      </main>
    )
  }

  return (
    <main className="p-4 max-w-7xl mx-auto space-y-8 w-full">
      <Header title="Import Transactions" />
      <p className="text-muted-foreground">
        Statement import <code className="text-foreground">{id}</code> uploaded
        successfully. AI extraction and review coming in Phase 2.
      </p>
    </main>
  )
}
```

**Step 2: Verify build**

Run: `pnpm run build`

**Step 3: Commit**

```bash
git add app/\(dashboard\)/expenses/import/page.tsx
git commit -m "feat: add placeholder import page at /expenses/import"
```

---

### Task 10: Final verification

**Step 1: Run lint**

Run: `pnpm run lint`
Expected: No errors

**Step 2: Run build**

Run: `pnpm run build`
Expected: Build succeeds

**Step 3: Commit all remaining changes (if any)**

```bash
git add -A
git commit -m "feat: statement import phase 1 — models and S3 upload"
```
