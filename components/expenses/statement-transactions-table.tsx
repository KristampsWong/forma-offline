"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatAmount } from "@/lib/utils"
import type { StatementTransaction } from "@/actions/statementimports"

interface StatementTransactionsTableProps {
  transactions: StatementTransaction[]
}

export function StatementTransactionsTable({
  transactions,
}: StatementTransactionsTableProps) {
  if (transactions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No transactions found.</p>
    )
  }

  return (
    <div className="overflow-hidden ">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-end">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: transactions have no unique id
              <TableRow key={i}>
                <TableCell className="whitespace-nowrap">{t.date}</TableCell>
                <TableCell>
                  <span className="max-w-60 truncate block">
                    {t.description}
                  </span>
                </TableCell>
                <TableCell>{t.categoryName ?? "—"}</TableCell>
                <TableCell className="text-end tracking-wide">
                  {formatAmount(t.amount, "currency")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="px-2 py-3 text-sm text-muted-foreground">
        {transactions.length} transaction{transactions.length !== 1 && "s"}
      </div>
    </div>
  )
}
