"use client"

import { useEffect,useState } from "react"
import { AmountInput } from "@/components/ui/amount-input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PayFrequency } from "@/lib/constants/employment-constants"
import { formatAmount } from "@/lib/utils"
import type { PayrollTableData } from "@/types/payroll"
import { RoundingToCents } from "@/lib/payroll"
interface PayrollEmployeeListProps {
  data: PayrollTableData[]
  startDate: string
  endDate: string
  payDate: string
  periodType: PayFrequency
  hasEddAccount: boolean
}

export default function PayrollEmployeeList({
  data = [],
  startDate,
  endDate,
  payDate,
  periodType,
  hasEddAccount,
}: PayrollEmployeeListProps) {
  // Check for EDD account on page load
  useEffect(() => {
    if (!hasEddAccount) {
      window.location.hash = "#settings/state-rates"
    }
  }, [hasEddAccount])
  const [hoursMap, setHoursMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(data.map((e) => [e.id, e.hours ? String(e.hours) : ""]))
  )
  const [grossPayMap, setGrossPayMap] = useState<Record<string, number>>(() =>
    Object.fromEntries(data.map((e) => [e.id, e.grossPay]))
  )
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-start capitalize w-1/5">name</TableHead>
            <TableHead className="text-start capitalize w-1/5">
              Regular pay
            </TableHead>
            <TableHead className="text-start capitalize w-1/5">
              total hrs
            </TableHead>
            <TableHead className="text-start capitalize w-1/5">
              gross pay
            </TableHead>
            <TableHead className="text-start capitalize w-1/5">
              status
            </TableHead>
            <TableHead className="text-end capitalize w-1/5">actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium text-start">
                  {employee.name}
                </TableCell>
                <TableCell className="font-medium text-start">
                  {formatAmount(employee.regularPay, "currency")}/hr
                </TableCell>
                <TableCell className="font-medium text-start">
                  <AmountInput
                    prefix=""
                    suffix="hrs"
                    value={hoursMap[employee.id] ?? ""}
                    placeholder="0.00"
                    className="w-24"
                    onChange={(value) => {
                      setHoursMap((prev) => ({ ...prev, [employee.id]: value }))
                      const newHours = Number(value) || 0
                      setGrossPayMap((prev) => ({
                        ...prev,
                        [employee.id]: RoundingToCents(employee.regularPay * newHours),
                      }))
                    }}
                  />
                </TableCell>
                <TableCell className="font-medium text-start tracking-wide">
                  {formatAmount(grossPayMap[employee.id] ?? employee.grossPay, "currency")}
                </TableCell>
                <TableCell className="font-medium text-start capitalize">
                  {employee.status}
                </TableCell>
                <TableCell className="text-end">
                  <Button variant="outline" size="sm">
                    {employee.status === "approved" ? "View" : "Edit"}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                No employees found. Add employees to run payroll.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
