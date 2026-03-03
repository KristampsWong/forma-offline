"use client"

import { useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import {
  extractTransactions,
  type StatementTransaction,
} from "@/actions/statementimports"
import { Button } from "@/components/ui/button"
import { StatementTransactionsTable } from "@/components/expenses/statement-transactions-table"

interface ExtractPanelProps {
  importId: string
  initialStatus: string
  initialTransactions: StatementTransaction[]
  categories: { value: string; label: string }[]
}

export default function ExtractPanel({
  importId,
  initialStatus,
  initialTransactions,
  categories,
}: ExtractPanelProps) {
  const [loading, setLoading] = useState(false)
  const [transactions, setTransactions] =
    useState<StatementTransaction[]>(initialTransactions)
  const [status, setStatus] = useState(initialStatus)

  async function handleExtract() {
    setLoading(true)
    try {
      const result = await extractTransactions(importId)
      if (result.success) {
        toast.success("Transactions extracted successfully")
        setTransactions(result.data)
        setStatus("ready")
      } else {
        toast.error(result.error)
        setStatus("failed")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  function handleTransactionUpdate(index: number, updated: StatementTransaction) {
    setTransactions((prev) =>
      prev.map((t, i) => (i === index ? updated : t))
    )
  }

  function handleConfirm() {
    setStatus("confirmed")
  }

  return (
    <div className="space-y-4">
      {(status === "uploaded" || status === "failed") && (
        <Button onClick={handleExtract} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Extract Transactions
            </>
          )}
        </Button>
      )}
      {transactions.length > 0 && (
        <StatementTransactionsTable
          importId={importId}
          transactions={transactions}
          categories={categories}
          status={status}
          onTransactionUpdate={handleTransactionUpdate}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}
