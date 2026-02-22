"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { formatAmount } from "@/lib/utils"
import type { MonthlyBreakdownRow } from "@/types/expense"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

interface MonthlyBreakdownTableProps {
  data: MonthlyBreakdownRow[]
  year: number
}

export function MonthlyBreakdownTable({ data, year }: MonthlyBreakdownTableProps) {
  const router = useRouter()

  // Compute column totals
  const monthTotals = Array(12).fill(0) as number[]
  let grandTotal = 0
  for (const row of data) {
    for (let i = 0; i < 12; i++) {
      monthTotals[i] += row.months[i]
    }
    grandTotal += row.total
  }

  function changeYear(delta: number) {
    const params = new URLSearchParams()
    params.set("year", String(year + delta))
    router.push(`/reports?${params.toString()}`)
  }

  return (
    <Card className="py-0">
      {/* Year selector */}
      <div className="flex items-center gap-2 p-4 border-b">
        <Button variant="outline" size="icon" onClick={() => changeYear(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium w-16 text-center">{year}</span>
        <Button variant="outline" size="icon" onClick={() => changeYear(1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start min-w-[120px]">Category</TableHead>
              {MONTH_LABELS.map((m) => (
                <TableHead key={m} className="text-end min-w-[80px]">
                  {m}
                </TableHead>
              ))}
              <TableHead className="text-end min-w-[100px]">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={14}
                  className="h-24 text-center text-muted-foreground"
                >
                  No expenses found for this year.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.categoryId}>
                  <TableCell className="text-start font-medium">
                    {row.categoryName}
                  </TableCell>
                  {row.months.map((amount, i) => (
                    <TableCell key={i} className="text-end">
                      {amount > 0 ? formatAmount(amount, "currency") : "—"}
                    </TableCell>
                  ))}
                  <TableCell className="text-end font-medium">
                    {formatAmount(row.total, "currency")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {data.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell className="text-start font-bold">Total</TableCell>
                {monthTotals.map((total, i) => (
                  <TableCell key={i} className="text-end font-bold">
                    {total > 0 ? formatAmount(total, "currency") : "—"}
                  </TableCell>
                ))}
                <TableCell className="text-end font-bold">
                  {formatAmount(grandTotal, "currency")}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </Card>
  )
}
