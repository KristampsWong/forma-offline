# Statement Import AI Extraction — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract transactions from uploaded PDF bank statements using OpenAI GPT-4o, classify them against expense categories, and write results to the StatementImport model.

**Architecture:** New OpenAI client singleton (`lib/ai/client.ts`) + pure extraction function (`lib/ai/extract-transactions.ts`) + service orchestrator (`lib/services/expenses/extraction.ts`) + server action. Follows existing service-layer pattern — actions are thin auth wrappers, services own business logic.

**Tech Stack:** OpenAI SDK (GPT-4o with file input), Zod 4 validation, existing S3 + Mongoose infrastructure.

---

### Task 1: Install OpenAI SDK and add env var

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `.env` (local)

**Step 1: Install openai package**

Run: `pnpm add openai`

**Step 2: Add OPENAI_API_KEY to .env.example**

Add after the AWS variables block (around line 36):

```
OPENAI_API_KEY=
```

**Step 3: Add your actual key to .env**

Add `OPENAI_API_KEY=sk-...` to your local `.env` file.

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "chore: add openai sdk dependency"
```

---

### Task 2: Create OpenAI client singleton

**Files:**
- Create: `lib/ai/client.ts`

**Step 1: Create the client file**

```typescript
import OpenAI from "openai"

import { isBuildTime } from "@/lib/env"

let client: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (isBuildTime()) {
    throw new Error("OpenAI client is not available during build time")
  }

  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error("Missing required environment variable: OPENAI_API_KEY")
    }
    client = new OpenAI({ apiKey })
  }

  return client
}
```

**Step 2: Commit**

```bash
git add lib/ai/client.ts
git commit -m "feat: add OpenAI client singleton"
```

---

### Task 3: Create AI extraction module (pure function)

**Files:**
- Create: `lib/ai/extract-transactions.ts`

**Step 1: Create the extraction module**

This is a pure function — no DB access. Takes PDF bytes + categories, returns parsed transactions.

```typescript
import { z } from "zod/v4"

import { getOpenAIClient } from "@/lib/ai/client"
import { createModuleLogger } from "@/lib/logger"

const log = createModuleLogger("extract-transactions")

const TransactionSchema = z.object({
  date: z.string(),
  description: z.string(),
  amount: z.number().positive(),
  type: z.enum(["debit", "credit"]),
  categoryName: z.string().optional(),
})

const ExtractionResultSchema = z.object({
  transactions: z.array(TransactionSchema),
})

export type ExtractedTransactionRaw = z.infer<typeof TransactionSchema>

interface CategoryInput {
  _id: string
  name: string
}

export async function extractTransactionsFromPDF(
  pdfBytes: Buffer,
  categories: CategoryInput[]
): Promise<ExtractedTransactionRaw[]> {
  const openai = getOpenAIClient()

  const categoryList = categories.map((c) => c.name).join(", ")

  const base64PDF = pdfBytes.toString("base64")

  log.info("Sending PDF to OpenAI for extraction")

  const response = await openai.responses.create({
    model: "gpt-4o",
    input: [
      {
        role: "user",
        content: [
          {
            type: "file",
            file: {
              data: base64PDF,
              filename: "statement.pdf",
            },
          },
          {
            type: "input_text",
            text: `You are a bank statement parser. Extract all transactions from this PDF bank statement.

For each transaction, provide:
- date: The transaction date in MM/DD/YYYY format
- description: A clean description of the transaction (merchant name or description)
- amount: The transaction amount as a positive number
- type: "debit" for charges/withdrawals, "credit" for deposits/payments received
- categoryName: The best matching category from this list: [${categoryList}]. If no category is a good match, omit this field.

Return ONLY valid JSON in this exact format:
{
  "transactions": [
    {
      "date": "MM/DD/YYYY",
      "description": "string",
      "amount": number,
      "type": "debit" | "credit",
      "categoryName": "string or omit"
    }
  ]
}

Important:
- Extract ALL transactions visible in the statement
- Amounts must always be positive numbers
- Dates must be in MM/DD/YYYY format
- Do not include running balances, fees summaries, or non-transaction entries
- Return ONLY the JSON object, no markdown or explanation`,
          },
        ],
      },
    ],
  })

  const text =
    response.output_text

  log.debug("OpenAI raw response", text)

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*\n?/g, "").replace(/\n?```\s*$/g, "").trim()

  const parsed = JSON.parse(cleaned)
  const validated = ExtractionResultSchema.parse(parsed)

  log.info(`Extracted ${validated.transactions.length} transactions`)

  return validated.transactions
}
```

**Step 2: Commit**

```bash
git add lib/ai/extract-transactions.ts
git commit -m "feat: add AI transaction extraction module"
```

---

### Task 4: Create extraction service (orchestration)

**Files:**
- Create: `lib/services/expenses/extraction.ts`

**Step 1: Create the service**

This orchestrates: fetch PDF from S3, fetch categories, call AI, write results to DB.

```typescript
import { GetObjectCommand } from "@aws-sdk/client-s3"

import { extractTransactionsFromPDF } from "@/lib/ai/extract-transactions"
import type { ExtractedTransactionRaw } from "@/lib/ai/extract-transactions"
import { COMPANY_ERRORS, STATEMENT_IMPORT_ERRORS } from "@/lib/constants/errors"
import dbConnect from "@/lib/db/dbConnect"
import { createModuleLogger } from "@/lib/logger"
import { getS3Bucket, getS3Client } from "@/lib/s3/client"
import Company from "@/models/company"
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

  if (statementImport.status !== "uploaded") {
    throw new Error("Extraction can only be performed on uploaded statements")
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
    const rawTransactions = await extractTransactionsFromPDF(pdfBytes, categories)

    // 4. Map categoryName → categoryId
    const categoryMap = new Map(
      categories.map((c) => [c.name.toLowerCase(), c._id.toString()])
    )

    const transactions = rawTransactions.map((t: ExtractedTransactionRaw) => ({
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      categoryId: t.categoryName
        ? categoryMap.get(t.categoryName.toLowerCase())
        : undefined,
      selected: true,
    }))

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
```

**Step 2: Commit**

```bash
git add lib/services/expenses/extraction.ts
git commit -m "feat: add statement extraction service"
```

---

### Task 5: Add server action and error constants

**Files:**
- Modify: `actions/statementimports.ts`
- Modify: `lib/constants/errors.ts`

**Step 1: Add error constants**

In `lib/constants/errors.ts`, add to `STATEMENT_IMPORT_ERRORS`:

```typescript
EXTRACTION_FAILED: "Failed to extract transactions from statement",
NOT_UPLOADED: "Extraction can only be performed on uploaded statements",
```

**Step 2: Add extractTransactions action**

In `actions/statementimports.ts`, add:

```typescript
import { extractStatementTransactions } from "@/lib/services/expenses/extraction"

export async function extractTransactions(importId: string) {
  return withAuth(async (userId) => {
    await extractStatementTransactions(userId, importId)
    return { importId }
  })
}
```

**Step 3: Commit**

```bash
git add actions/statementimports.ts lib/constants/errors.ts
git commit -m "feat: add extractTransactions server action"
```

---

### Task 6: Verify build passes

**Step 1: Run lint**

Run: `pnpm run lint`
Expected: No errors

**Step 2: Run build**

Run: `pnpm run build`
Expected: Build succeeds (OpenAI client has build-time guard)

**Step 3: Final commit if any fixes needed**
