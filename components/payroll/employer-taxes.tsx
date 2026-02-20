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
import FormLayout from "./form-layout"

export default function EmployerTaxes({
  employerTax,
  ytd,
}: {
  employerTax: PayrollRecord["employerTaxes"]
  ytd: YTDData
}) {
  const { socialSecurityTax, medicareTax, futa, sui, ett, total } = employerTax
  const {
    employerTotalFUTA,
    employerTotalSocialSecurity,
    employerTotalMedicare,
    employerTotalCAETT,
    employerTotalCASUI,
    employerTotal,
  } = ytd
  return (
    <FormLayout title="Employer taxes">
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
            <TableCell className="capitalize">FUTA Employer</TableCell>
            <TableCell className="text-end tracking-wide">
              {formatAmount(futa, "currency")}
            </TableCell>

            <TableCell className="text-end tracking-wide">
              {formatAmount(employerTotalFUTA, "currency")}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="capitalize">
              Social Security Employer
            </TableCell>
            <TableCell className="text-end tracking-wide">
              {formatAmount(socialSecurityTax, "currency")}
            </TableCell>

            <TableCell className="text-end tracking-wide">
              {formatAmount(employerTotalSocialSecurity, "currency")}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="capitalize">Medicare Employer</TableCell>
            <TableCell className="text-end tracking-wide">
              {formatAmount(medicareTax, "currency")}
            </TableCell>

            <TableCell className="text-end tracking-wide">
              {formatAmount(employerTotalMedicare, "currency")}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="capitalize">CA ETT</TableCell>
            <TableCell className="text-end tracking-wide">
              {formatAmount(ett, "currency")}
            </TableCell>

            <TableCell className="text-end tracking-wide">
              {formatAmount(employerTotalCAETT, "currency")}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="capitalize">CA SUI Employer</TableCell>
            <TableCell className="text-end tracking-wide">
              {formatAmount(sui, "currency")}
            </TableCell>

            <TableCell className="text-end tracking-wide">
              {formatAmount(employerTotalCASUI, "currency")}
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
              {formatAmount(employerTotal, "currency")}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </FormLayout>
  )
}
