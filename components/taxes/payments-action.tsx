"use client"

import { CircleCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import type { TaxPaymentType } from "@/lib/constants/tax-constants"
// import { markTaxPaymentAsPaid } from "@/actions/taxes/taxpayment-update"
import ConfirmDialog from "@/components/taxes/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function PaymentActions({
  taxPaymentId,
  taxPaymentType,
  status,
  accruing,
  periodStart,
  periodEnd,
}: {
  taxPaymentId: string
  taxPaymentType: TaxPaymentType
  status?: "pending" | "paid" | "overdue"
  accruing?: boolean
  periodStart?: Date
  periodEnd?: Date
}) {
  const router = useRouter()

  const handleMarkAsPaid = async () => {
    // await markTaxPaymentAsPaid(taxPaymentId, taxPaymentType, new Date())
    router.refresh()
  }

  if (status === "paid") {
    return (
      <div className="flex flex-col gap-2 items-end w-28">
        <Badge variant="outline" className="text-xs">
          <CircleCheck className="size-4 mr-1 inline-block fill-green-400 text-background" />
          Paid
        </Badge>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <ConfirmDialog
        trigger={
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Mark as Paid
          </button>
        }
        type="payment"
        accruing={accruing}
        periodStart={periodStart}
        periodEnd={periodEnd}
        onConfirm={handleMarkAsPaid}
      />
    </div>
  )
}
