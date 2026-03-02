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
  categories: CategoryInput[],
  fileName: string
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
            type: "input_file",
            filename: fileName,
            file_data: `data:application/pdf;base64,${base64PDF}`,
          },
          {
            type: "input_text",
            text: `You are a bank statement parser. Extract all transactions from this PDF bank statement.

For each transaction, provide:
- date: The transaction date in MM/DD/YYYY format
- description: A clean description of the transaction (merchant name or description)
- amount: The transaction amount as a positive number
- type: "debit" for charges/withdrawals, "credit" for deposits/payments received
- categoryName: The best matching category from this list: [${categoryList}]. If no category is a good match, use Other.

Return ONLY valid JSON in this exact format:
{
  "transactions": [
    {
      "date": "01/15/2026",
      "description": "Starbucks Coffee",
      "amount": 5.75,
      "type": "debit",
      "categoryName": "Food & Dining"
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

  const text = response.output_text

  log.debug("OpenAI raw response", text)

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\s*\n?/g, "").replace(/\n?```\s*$/g, "").trim()

  const parsed = JSON.parse(cleaned)
  const validated = ExtractionResultSchema.parse(parsed)

  log.info(`Extracted ${validated.transactions.length} transactions`)

  return validated.transactions
}
