# Statement Import AI Extraction — Design

## Overview

Add backend functionality to extract transactions from uploaded PDF bank statements using OpenAI GPT-4o, classify them against the user's expense categories, and write results to the StatementImport model.

## Flow

1. User triggers extraction on an `"uploaded"` StatementImport
2. Status transitions to `"extracting"`
3. Service fetches PDF bytes from S3 and user's expense categories from DB
4. PDF bytes + category list sent to OpenAI GPT-4o (file input, base64-encoded)
5. AI response validated with Zod, transactions written to StatementImport doc
6. Status transitions to `"ready"` (or `"failed"` with error on failure)

## Architecture

| Layer | File | Responsibility |
|-------|------|----------------|
| Action | `actions/statementimports.ts` | `extractTransactions(importId)` — auth, delegates to service |
| Service | `lib/services/expenses/extraction.ts` | Orchestration: S3 fetch, category fetch, AI call, DB write |
| AI module | `lib/ai/extract-transactions.ts` | Pure function: PDF bytes + categories → parsed transactions |
| OpenAI client | `lib/ai/client.ts` | Singleton OpenAI client |

## AI Response Schema

```ts
{
  transactions: Array<{
    date: string        // MM/DD/YYYY
    description: string
    amount: number      // positive
    type: "debit" | "credit"
    categoryId?: string // matched category ObjectId if confident
  }>
}
```

`selected` defaults to `true` when persisted.

## Dependencies

- `openai` npm package
- `OPENAI_API_KEY` environment variable

## Error Handling

- Import must be in `"uploaded"` status to begin extraction
- OpenAI failures or unparseable responses → status `"failed"` with error message
- Zod validation on AI response to catch malformed output

## Scope

Backend only. UI, approval flow, and expense creation are handled separately.
