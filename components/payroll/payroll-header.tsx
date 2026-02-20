import { extractDateOnly } from "@/lib/date/utils"
import { formatAmount } from "@/lib/utils"
import type { PayrollRecord } from "@/types/payroll"
export default function PayrollHeader({
  employee,
  address,
  netPay,
  periodStart,
  periodEnd,
  payDate,
}: {
  employee: PayrollRecord["employeeInfo"]
  address: PayrollRecord["address"]
  netPay: number
  periodStart: string
  periodEnd: string
  payDate: string
}) {
  const { firstName, lastName } = employee
  const { street1, street2, city, state, zipCode } = address || {}
  return (
    <div className="flex flex-col gap-10">
      <div className="flex justify-between">
        <div>
          <h1 className="text-muted-foreground text-lg uppercase ">Pay to</h1>
          <h2 className="text-3xl font-medium capitalize">
            {firstName} {lastName}
          </h2>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-end text-lg uppercase ">
            Net pay
          </span>
          <span className="font-medium text-3xl tracking-wide">
            {formatAmount(netPay, "currency")}
          </span>
        </div>
      </div>

      <div className="flex text-sm gap-20">
        <div className="flex flex-col gap-2">
          <span className="font-semibold text-muted-foreground">
            Employee address
          </span>
          <span className="">
            {street1 || "N/A"}, {street2 || ""}
          </span>
          <span className="">
            {city || ""}, {state || ""} {zipCode || ""}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-semibold text-muted-foreground">Pay date</span>
          <span className="">
            {extractDateOnly(payDate)}
          </span>

          <span className="font-semibold text-muted-foreground">Paid from</span>
          <span className="">Business Checking</span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-semibold text-muted-foreground">
            Pay period
          </span>
          <span className="">
            {extractDateOnly(periodStart)} to {extractDateOnly(periodEnd)}
          </span>

          <span className="font-semibold text-muted-foreground">Paid by</span>
          <span className="tracking-wide">
            Check({formatAmount(netPay, "currency")})
          </span>
        </div>
      </div>
    </div>
  )
}
