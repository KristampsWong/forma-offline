import { UserRound } from "lucide-react"
import { redirect } from "next/navigation"

import { getAllEmployees } from "@/actions/employee"
import { formatAmount } from "@/lib/utils"
import Avatar from "@/components/avatar"
import { AddEmployeeButton } from "@/components/employee/add-employee-button"
import Header from "@/components/header"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
export default async function Page() {
  const result = await getAllEmployees()
  const employees = result.success && result.employees ? result.employees : []
  return (
    <section className="p-4 max-w-7xl mx-auto space-y-8 w-full">
      <Header>
        <h1 className="text-2xl font-semibold">Employees</h1>
        <AddEmployeeButton />
      </Header>

      <Card className="min-h-1/2 py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start w-1/4">
                <UserRound className="size-4 ml-1" />
              </TableHead>
              <TableHead className="text-start capitalize w-1/4">
                name
              </TableHead>
              <TableHead className="text-start capitalize w-1/4">
                pay rate
              </TableHead>
              <TableHead className="text-start capitalize w-1/4">
                pay method
              </TableHead>
              <TableHead className="text-end capitalize w-1/4">
                status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  No employees found. Add your first employee to get started.
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => {
                // Format pay rate based on pay type
                const payRateDisplay =
                  employee.currentCompensation.payType === "hourly"
                    ? `${formatAmount(employee.currentCompensation.salary, "currency")}/hr`
                    : `${formatAmount(employee.currentCompensation.salary, "currency")}/yr`

                return (
                  <TableRow
                    key={employee.id}
                    onClick={async () => {
                      "use server"
                      redirect(`/employees/${employee.id}`)
                    }}
                    className="cursor-pointer h-14"
                  >
                    <TableCell>
                      <Avatar name={employee.firstName} />
                    </TableCell>
                    <TableCell className="font-medium text-start">
                      {employee.firstName} {employee.lastName}
                    </TableCell>
                    <TableCell className="font-medium text-start">
                      {payRateDisplay}
                    </TableCell>
                    <TableCell className="font-medium text-start capitalize">
                      {employee.currentPayMethod.payMethod}
                    </TableCell>
                    <TableCell className="font-medium text-end capitalize">
                      {employee.employmentStatus}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </section>
  )
}
