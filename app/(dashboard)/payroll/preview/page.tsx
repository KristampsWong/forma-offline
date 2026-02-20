import Link from "next/link"
import { redirect } from "next/navigation"
import { getPreviewPayroll } from "@/actions/payroll"
import Header from "@/components/header"
import { SubmitPayrollButton } from "@/components/payroll/submit-payroll-button"
import Breadcrumb, {
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatAmount } from "@/lib/utils"
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>
}) {
  const { startDate, endDate } = await searchParams
  if (!startDate || !endDate) {
    return redirect(`/payroll`)
  }
  // getPreviewPayroll uses currentUser() internally for tenant isolation
  const previewResult = await getPreviewPayroll(startDate, endDate)

  const hasZeroHourEmployees =
    previewResult.data &&
    previewResult.data.some((employee) => employee.totalHours === 0)
  if (!previewResult.success || !previewResult.data) {
    return (
      <main className="p-4 max-w-7xl mx-auto space-y-8 w-full">
        <Header>
          <Breadcrumb>
            <BreadcrumbLink href={`/payroll`} text={"Payroll"} />
            <BreadcrumbSeparator />
            <span className="text-foreground font-semibold">
              Preview Payroll
            </span>
          </Breadcrumb>
        </Header>
        <div className="text-center text-muted-foreground">
          Error loading payroll preview:{" "}
          {previewResult.error || "Unknown error"}
        </div>
      </main>
    )
  }
  const {
    totalPayrollCost,
    totalGrossPay,
    totalEmployerTaxesAndContributions,
    totalNetPay,
  } = previewResult.overview
  return (
    <main className="p-4 max-w-7xl mx-auto space-y-8 w-full">
      <Header>
        <Breadcrumb>
          <BreadcrumbLink href={`/payroll`} text={"Payroll"} />
          <BreadcrumbSeparator />
          <span className="text-foreground font-semibold">Preview Payroll</span>
        </Breadcrumb>
      </Header>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle> Total Payroll Cost</CardTitle>
            <span className="text-xl font-medium">
              {formatAmount(totalPayrollCost, "currency")}
            </span>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Gross Pay</span>
              <span className="tracking-wide">
                {formatAmount(totalGrossPay, "currency")}
              </span>
            </div>
            <div className="flex  justify-between items-start">
              <span className="text-sm leading-4 text-muted-foreground">
                Employer taxes &amp;
                <br />
                contributions
              </span>
              <span className="tracking-wide">
                {formatAmount(totalEmployerTaxesAndContributions, "currency")}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="text-sm font-medium  flex justify-between">
              <span className="text-muted-foreground">Pay period:</span>
              <span>{`${previewResult.overview.payPeriodStart} - ${previewResult.overview.payPeriodEnd}`}</span>
            </div>
            <div className="text-sm font-medium flex justify-between">
              <span className="text-muted-foreground ">Pay date: </span>
              <span>{previewResult.overview.payDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Paper checks
              </span>
              <span className="tracking-wide">
                {formatAmount(totalNetPay, "currency")}
              </span>
            </div>
          </CardHeader>
        </Card>
      </div>
      {/* Employee Details Table */}
      <div className="space-y-4 ">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start capitalize w-1/6 py-2 align-top">
                name
              </TableHead>
              <TableHead className="text-start capitalize w-1/6 py-2 align-top">
                total hrs
              </TableHead>
              <TableHead className="text-start capitalize w-1/6 py-2 align-top">
                gross pay
              </TableHead>
              <TableHead className="text-center capitalize w-1/6 py-2 align-top">
                employee taxes &<br />
                deductions
              </TableHead>
              <TableHead className="text-center capitalize w-1/6 py-2 align-top">
                net pay
              </TableHead>
              <TableHead className="text-end capitalize w-1/6 py-2 align-top">
                employer taxes &<br />
                contributions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewResult.data.length > 0 ? (
              previewResult.data.map((employee) => (
                <TableRow
                  key={employee.employeeId}
                  className="cursor-pointer tracking-wide h-14"
                >
                  <TableCell className="font-medium text-start">
                    {employee.employeeName}
                  </TableCell>
                  <TableCell className="font-medium text-start">
                    {employee.totalHours.toFixed(2)}hrs
                  </TableCell>
                  <TableCell className="font-medium text-start">
                    {formatAmount(employee.grossPay, "currency")}
                  </TableCell>
                  <TableCell className="font-medium text-center">
                    {formatAmount(
                      employee.employeeTaxesAndDeductions,
                      "currency",
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-center">
                    {formatAmount(employee.netPay, "currency")}
                  </TableCell>
                  <TableCell className="font-medium text-end">
                    {formatAmount(
                      employee.employerTaxesAndContributions,
                      "currency",
                    )}
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
      <div className="flex justify-end gap-4">
        <Link
          href={`/payroll?periodType=${previewResult.data[0].payFrequency}&start=${startDate}&end=${endDate}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Back to Edit
        </Link>
        <SubmitPayrollButton
          payrollIds={previewResult.data.map((employee) => employee.payrollId)}
          redirectDate={startDate}
          hasZeroHourEmployees={hasZeroHourEmployees}
        />
      </div>
    </main>
  )
}
