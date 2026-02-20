"use client"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatAmount } from "@/lib/utils"

interface PayrollEmployee {
  id: string
  name: string
  regularPay: number
  hours: number
  grossPay: number
  status: string
}

export default function PayrollEmployeeList({
  data = [],
}: {
  data?: PayrollEmployee[]
}) {
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
                  {employee.hours}
                </TableCell>
                <TableCell className="font-medium text-start tracking-wide">
                  {formatAmount(employee.grossPay, "currency")}
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
