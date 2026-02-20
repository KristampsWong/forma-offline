import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatAmount } from "@/lib/utils"
import type { PayrollRecord, YTDData } from "@/types/payroll"
import { Input } from "../ui/input"
import FormLayout from "./form-layout"

export default function EmployeeTaxes({
  employeeTax,
  setEmployeeTax,
  ytd,
  readOnly = false,
}: {
  employeeTax: PayrollRecord["deductions"]["taxes"]
  setEmployeeTax: (taxes: PayrollRecord["deductions"]["taxes"]) => void
  ytd: YTDData
  readOnly?: boolean
}) {
  const {
    federalIncomeTax,
    socialSecurityTax,
    medicareTax,
    stateIncomeTax,
    sdi,
    total,
  } = employeeTax

  const {
    totalFederalTax,
    totalStateTax,
    totalSocialSecurity,
    totalMedicare,
    totalSDI,
    totalDeductions,
  } = ytd
  return (
    <FormLayout title={"Employee taxes"}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-lg max-w-2xl uppercase">Type</TableHead>
            <TableHead className="text-end w-32">Current</TableHead>
            <TableHead className="text-end w-32">YTD</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className=" capitalize">Federal Income Tax</TableCell>
            <TableCell className="text-end">
              {readOnly ? (
                <span className="tracking-wide">
                  {formatAmount(federalIncomeTax, "currency")}
                </span>
              ) : (
                <>
                  <span>$ </span>
                  <Input
                    value={federalIncomeTax}
                    type="number"
                    className="w-24"
                    onChange={(e) => {
                      const newValue = Number(e.target.value)
                      setEmployeeTax({
                        ...employeeTax,
                        federalIncomeTax: newValue,
                      })
                    }}
                  />
                </>
              )}
            </TableCell>
            <TableCell className="text-end tracking-wide">
              {formatAmount(totalFederalTax, "currency")}
            </TableCell>
          </TableRow>

          <TableRow>
            <TableCell className=" capitalize">Social Security</TableCell>
            <TableCell className="text-end tracking-wide">
              {formatAmount(socialSecurityTax, "currency")}
            </TableCell>
            <TableCell className="text-end tracking-wide">
              {formatAmount(totalSocialSecurity, "currency")}
            </TableCell>
          </TableRow>

          <TableRow>
            <TableCell className=" capitalize">Medicare</TableCell>
            <TableCell className="text-end tracking-wide">
              {formatAmount(medicareTax, "currency")}
            </TableCell>
            <TableCell className="text-end tracking-wide">
              {formatAmount(totalMedicare, "currency")}
            </TableCell>
          </TableRow>

          <TableRow>
            <TableCell className=" capitalize">CA Income Tax</TableCell>
            <TableCell className="text-end tracking-wide">
              {formatAmount(stateIncomeTax, "currency")}
            </TableCell>
            <TableCell className="text-end tracking-wide">
              {formatAmount(totalStateTax, "currency")}
            </TableCell>
          </TableRow>

          <TableRow>
            <TableCell className=" capitalize">
              CA State Disability Ins
            </TableCell>
            <TableCell className="text-end tracking-wide">
              {formatAmount(sdi, "currency")}
            </TableCell>
            <TableCell className="text-end tracking-wide">
              {formatAmount(totalSDI, "currency")}
            </TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={1}>Total</TableCell>
            <TableCell className="text-end tracking-wide">
              {formatAmount(total, "currency")}
            </TableCell>
            <TableCell className="text-end tracking-wide">
              {formatAmount(totalDeductions, "currency")}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </FormLayout>
  )
}
