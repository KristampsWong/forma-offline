import { useEffect, useMemo } from "react"
import { AmountInput } from "@/components/ui/amount-input"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RoundingToCents } from "@/lib/payroll"
import { formatAmount } from "@/lib/utils"
import type { YTDData } from "@/types/payroll"
import FormLayout from "./form-layout"

export default function SalaryInput({
  regularHours,
  setRegularHours,
  overtimeHours,
  setOvertimeHours,
  overtimePayRate,
  setOvertimePayRate,
  commission,
  setCommission,
  otherPay,
  setOtherPay,
  payRate,
  setCurrentTotal,
  ytd,
  readOnly = false,
}: {
  regularHours: number
  setRegularHours: (hours: number) => void
  overtimeHours: number
  setOvertimeHours: (hours: number) => void
  overtimePayRate: number
  setOvertimePayRate: (rate: number) => void
  commission: number
  setCommission: (amount: number) => void
  otherPay: number
  setOtherPay: (amount: number) => void
  payRate: number
  ytd: YTDData["salary"]
  setCurrentTotal: (amount: number) => void
  readOnly?: boolean
}) {
  // Calculate each component using useMemo for performance
  const grossPay = useMemo(
    () => RoundingToCents(regularHours * payRate),
    [regularHours, payRate],
  )

  const overtimePay = useMemo(
    () => RoundingToCents(overtimeHours * overtimePayRate),
    [overtimeHours, overtimePayRate],
  )

  // Calculate total - this is the single source of truth
  const currentTotalPay = useMemo(
    () => RoundingToCents(grossPay + overtimePay + commission + otherPay),
    [grossPay, overtimePay, commission, otherPay],
  )

  // Update parent component whenever total changes
  useEffect(() => {
    setCurrentTotal(currentTotalPay)
  }, [currentTotalPay, setCurrentTotal])

  return (
    <FormLayout title="Pay">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead className="text-end w-32">Hours</TableHead>
            <TableHead className="text-end w-32">Rate</TableHead>
            <TableHead className="text-end w-32">Current</TableHead>
            <TableHead className="text-end w-32">YTD</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Regular Pay</TableCell>
            <TableCell className="text-end">
              {readOnly ? (
                <span className="">{formatAmount(regularHours)}</span>
              ) : (
                <AmountInput
                  prefix="$"
                  value={regularHours}
                  className="w-24"
                  onChange={setRegularHours}
                />
              )}
            </TableCell>
            <TableCell className="text-end">
              {formatAmount(payRate, "currency")}
            </TableCell>
            <TableCell className="text-end">
              {formatAmount(grossPay, "currency")}
            </TableCell>
            <TableCell className="text-end">
              {formatAmount(ytd.regularPay, "currency")}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Overtime Pay</TableCell>
            <TableCell className="text-end">
              {readOnly ? (
                <span className="">{formatAmount(overtimeHours)}</span>
              ) : (
                <AmountInput
                  prefix="$"
                  className="w-24"
                  value={overtimeHours}
                  onChange={setOvertimeHours}
                />
              )}
            </TableCell>
            <TableCell className="pr-0 text-end">
              {readOnly ? (
                <span className="pr-2">
                  {formatAmount(overtimePayRate, "currency")}
                </span>
              ) : (
                <AmountInput
                  prefix="$"
                  value={overtimePayRate}
                  className="w-24"
                  onChange={setOvertimePayRate}
                />
              )}
            </TableCell>

            <TableCell className="text-end tracking-wide">
              {formatAmount(overtimePay, "currency")}
            </TableCell>
            <TableCell className="text-end tracking-wide">
              {formatAmount(ytd.overtimePay, "currency")}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={3}>Commission</TableCell>
            <TableCell className="pr-0 text-end">
              {readOnly ? (
                <span className="pr-2">
                  {formatAmount(commission, "currency")}
                </span>
              ) : (
                <AmountInput
                  prefix="$"
                  value={commission}
                  className="w-24"
                  onChange={setCommission}
                />
              )}
            </TableCell>
            <TableCell className="text-end tracking-wide">
              {formatAmount(ytd.commissionPay, "currency")}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={3}>Other Pay</TableCell>

            <TableCell className="pr-0 text-end">
              {readOnly ? (
                <span className="pr-2">
                  {formatAmount(otherPay, "currency")}
                </span>
              ) : (
                <AmountInput
                  prefix="$"
                  value={otherPay}
                  className="w-24"
                  onChange={setOtherPay}
                />
              )}
            </TableCell>
            <TableCell className="text-end">
              {formatAmount(ytd.otherPay, "currency")}
            </TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>Total</TableCell>
            <TableCell className="text-end">
              {formatAmount(currentTotalPay, "currency")}
            </TableCell>
            <TableCell className="text-end">
              {formatAmount(ytd.totalGrossPay, "currency")}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </FormLayout>
  )
}
