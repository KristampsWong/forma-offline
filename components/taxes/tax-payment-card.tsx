"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { TaxPaymentType } from "@/lib/constants/tax-constants"
import type { Quarter } from "@/types/quarter"
import { extractDateOnly } from "@/lib/date/utils"
import DropdownList from "@/components/taxes/dropdown-list"
import PaymentActions from "@/components/taxes/payments-action"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type TaxPaymentCardProps = {
  id: string
  title: string
  taxType: TaxPaymentType
  periodStart: Date
  periodEnd: Date
  dueDate: Date
  paidDate?: Date
  quarter?: Quarter
  totalTax: number
  status?: "pending" | "paid"
  requiresImmediatePayment?: boolean
  isHighlighted?: boolean
  accruing?: boolean
  taxBreakdown: {
    // Federal 941
    federalIncomeTax?: number
    socialSecurityTax?: number
    socialSecurityEmployerTax?: number
    medicareTax?: number
    medicareEmployerTax?: number
    // Federal 940
    futaEmployer?: number
    // CA PIT/SDI
    caIncomeTax?: number
    caStateDisabilityIns?: number
    // CA SUI/ETT
    caSuiEmployer?: number
    caEtt?: number
  }
}

export default function TaxPaymentCard({
  id,
  title,
  taxType,
  periodStart,
  periodEnd,
  dueDate,
  paidDate,
  quarter,
  totalTax,
  status,
  requiresImmediatePayment,
  isHighlighted,
  taxBreakdown,
  accruing,
}: TaxPaymentCardProps) {
  const periodText = `${extractDateOnly(periodStart)} - ${extractDateOnly(periodEnd)}`
  // Only show overdue styling if it requires immediate payment
  const overdue =
    status !== "paid" && new Date() > dueDate && requiresImmediatePayment

  const [showHighlight, setShowHighlight] = useState(isHighlighted)

  useEffect(() => {
    if (isHighlighted) {
      setShowHighlight(true)
      const element = document.getElementById(`tax-card-${id}`)
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "center" })
        }, 100)
      }

      // Remove highlight after 2 seconds
      const timer = setTimeout(() => {
        setShowHighlight(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isHighlighted, id])

  const handleCardClick = () => {
    if (showHighlight) {
      setShowHighlight(false)
    }
  }

  return (
    <Card
      id={`tax-card-${id}`}
      onClick={handleCardClick}
      className={cn(
        "p-4 flex flex-row gap-4 transition-all duration-500",
        showHighlight && (overdue ? "ring-2 ring-red-400" : "ring-2 ring-ring"),
      )}
    >
      <span
        className={cn(
          "bg-primary/10 w-1 h-auto rounded-lg",
          requiresImmediatePayment && status !== "paid" && "bg-yellow-400",
          overdue && "bg-red-400",
        )}
      />
      <div className="w-full space-y-2">
        <div className="w-full flex  items-start gap-4">
          <span className="font-medium flex-1 min-w-0">{title}</span>

          <div className="flex items-start gap-16 shrink-0">
            <div className="font-medium whitespace-nowrap">
              {status === "paid" && paidDate
                ? `Paid ${extractDateOnly(paidDate)}`
                : `Due ${extractDateOnly(dueDate)}`}
            </div>

            <DropdownList totalTax={totalTax} {...taxBreakdown} />

            <PaymentActions
              taxPaymentId={id}
              taxPaymentType={taxType}
              status={status}
              accruing={accruing}
              periodStart={periodStart}
              periodEnd={periodEnd}
            />
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">
            {periodText} {quarter && `(${quarter})`}
            {accruing && ` • Accruing`}
          </span>
          {status !== "paid" && (
            <Link
              href="#"
              className="text-sm text-muted-foreground underline text-end mr-1"
            >
              Pay Instruction
            </Link>
          )}
        </div>
      </div>
    </Card>
  )
}
