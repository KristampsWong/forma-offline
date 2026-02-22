"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { formatAmount } from "@/lib/utils"
import type { ExpenseSummaryByCategory } from "@/types/expense"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateInput } from "@/lib/date/utils"

interface CategorySummaryTableProps {
  data: ExpenseSummaryByCategory[]
  startDate: string
  endDate: string
}

export function CategorySummaryTable({
  data,
  startDate,
  endDate,
}: CategorySummaryTableProps) {
  const router = useRouter()
  const [start, setStart] = useState(startDate)
  const [end, setEnd] = useState(endDate)

  const grandTotal = data.reduce((sum, row) => sum + row.total, 0)
  const grandCount = data.reduce((sum, row) => sum + row.count, 0)

  function applyFilter() {
    const params = new URLSearchParams()
    if (start) params.set("startDate", start)
    if (end) params.set("endDate", end)
    router.push(`/reports?${params.toString()}`)
  }

  return (
    <Card className="py-0">
      {/* Date range filter */}
      <div className="flex items-end gap-4 p-4 border-b">
        <div className="space-y-1">
          <Label htmlFor="summary-start">Start Date</Label>
          <Input
            id="summary-start"
            placeholder="MM/DD/YYYY"
            value={start}
            onChange={(e) => setStart(formatDateInput(e.target.value))}
            className="w-36"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="summary-end">End Date</Label>
          <Input
            id="summary-end"
            placeholder="MM/DD/YYYY"
            value={end}
            onChange={(e) => setEnd(formatDateInput(e.target.value))}
            className="w-36"
          />
        </div>
        <Button onClick={applyFilter} variant="outline">
          Apply
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-start">Category</TableHead>
            <TableHead className="text-end">Total</TableHead>
            <TableHead className="text-end">% of Total</TableHead>
            <TableHead className="text-end">Count</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="h-24 text-center text-muted-foreground"
              >
                No expenses found for this period.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.categoryId}>
                <TableCell className="text-start font-medium">
                  {row.categoryName}
                </TableCell>
                <TableCell className="text-end">
                  {formatAmount(row.total, "currency")}
                </TableCell>
                <TableCell className="text-end">{row.percentage}%</TableCell>
                <TableCell className="text-end">{row.count}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        {data.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell className="text-start font-bold">Total</TableCell>
              <TableCell className="text-end font-bold">
                {formatAmount(grandTotal, "currency")}
              </TableCell>
              <TableCell className="text-end font-bold">100%</TableCell>
              <TableCell className="text-end font-bold">{grandCount}</TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </Card>
  )
}
