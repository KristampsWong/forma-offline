# Bank Statement Import — Phase 1: Models & S3 Upload

## Scope

Phase 1 covers model changes and PDF upload to S3 only. AI extraction and review UI are deferred to Phase 2.

## Model Changes

### Expense model — add optional reference

Add `statementImportId?: ObjectId` (ref `StatementImport`) to `IExpense`. Allows tracing which expenses were auto-imported from a bank statement.

### Default expense categories — add "Other"

Add `"Other"` to `DEFAULT_EXPENSE_CATEGORIES` in `actions/company.ts`. Used as fallback when AI cannot classify a transaction.

### New model: StatementImport

```ts
interface IStatementImport {
  companyId: ObjectId
  fileName: string
  s3Key: string
  status: "uploaded" | "extracting" | "ready" | "confirmed" | "failed"
  transactions: IExtractedTransaction[]
  error?: string
  createdAt: Date
  updatedAt: Date
}

interface IExtractedTransaction {
  date: string
  description: string
  amount: number
  type: "debit" | "credit"
  categoryId?: ObjectId
  selected: boolean
}
```

Index: `{ companyId: 1, createdAt: -1 }`

## S3 Upload

### API Route: `POST /api/upload/statement`

- Accepts `multipart/form-data` with a single PDF file
- Validates: auth, file type (PDF only), file size (max 10MB)
- Uploads to S3 bucket with key: `statements/{companyId}/{importId}.pdf`
- Creates `StatementImport` record with status `"uploaded"`
- Returns `{ importId: string }`

### Dependencies

- `@aws-sdk/client-s3` — S3 client

### Environment Variables

- `AWS_S3_BUCKET` — bucket name
- `AWS_S3_REGION` — region
- `AWS_ACCESS_KEY_ID` — credentials
- `AWS_SECRET_ACCESS_KEY` — credentials

## Upload Dialog Changes

Update `UploadExpenseDialog` to:
1. Call `POST /api/upload/statement` with FormData
2. Show loading state during upload
3. On success, navigate to `/expenses/import?id={importId}`
4. On error, show toast

## Files

| File | Action |
|------|--------|
| `models/expense.ts` | Add `statementImportId` field |
| `models/statement-import.ts` | New model |
| `actions/company.ts` | Add "Other" to defaults |
| `app/api/upload/statement/route.ts` | New API route |
| `lib/s3/client.ts` | S3 client singleton |
| `components/expenses/upload-files/upload-expense-dialog.tsx` | Wire up upload |
| `lib/constants/errors.ts` | Add STATEMENT_IMPORT errors |
| `.env.example` | Add S3 env vars |
