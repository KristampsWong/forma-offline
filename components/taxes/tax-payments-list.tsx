"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import type { TaxPaymentType } from "@/lib/constants/tax-constants"
import type { Quarter } from "@/types/quarter"
import TaxPaymentCard from "./tax-payment-card"

type TaxRecord = {
  _id: string
  periodStart: Date
  periodEnd: Date
  dueDate: Date
  paidDate?: Date
  totalTax: number
  status: "pending" | "paid"
  quarter?: Quarter
  requiresImmediatePayment?: boolean
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

type TaxPaymentsListProps = {
  records: TaxRecord[]
  title: string
  taxType: TaxPaymentType
}

export default function TaxPaymentsList({
  records,
  title,
  taxType,
}: TaxPaymentsListProps) {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get("highlight")
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null)

  useEffect(() => {
    if (highlightId) {
      setActiveHighlight(highlightId)

      // Scroll to highlighted card
      const element = document.getElementById(`tax-card-${highlightId}`)
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "center" })
        }, 100)
      }

      // Remove highlight after animation
      const timer = setTimeout(() => {
        setActiveHighlight(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [highlightId])

  return (
    <>
      {records.map((record) => {
        const isHighlighted = activeHighlight === record._id

        if (taxType === "federal941") {
          return (
            <TaxPaymentCard
              key={record._id}
              id={record._id}
              title={title}
              taxType={taxType}
              periodStart={record.periodStart}
              periodEnd={record.periodEnd}
              dueDate={record.dueDate}
              paidDate={record.paidDate}
              totalTax={record.totalTax}
              status={record.status}
              quarter={record.quarter}
              requiresImmediatePayment={record.requiresImmediatePayment}
              isHighlighted={isHighlighted}
              taxBreakdown={{
                federalIncomeTax: record.federalIncomeTax,
                socialSecurityTax: record.socialSecurityTax,
                socialSecurityEmployerTax: record.socialSecurityEmployerTax,
                medicareTax: record.medicareTax,
                medicareEmployerTax: record.medicareEmployerTax,
              }}
            />
          )
        }

        if (taxType === "federal940") {
          // Federal 940 is quarterly - accruing if current date is within periodStart-periodEnd
          const now = new Date()
          const isAccruing =
            now >= new Date(record.periodStart) &&
            now <= new Date(record.periodEnd)

          return (
            <TaxPaymentCard
              key={record._id}
              id={record._id}
              title={title}
              taxType={taxType}
              periodStart={record.periodStart}
              periodEnd={record.periodEnd}
              dueDate={record.dueDate}
              paidDate={record.paidDate}
              totalTax={record.totalTax}
              status={record.status}
              quarter={record.quarter}
              requiresImmediatePayment={record.requiresImmediatePayment}
              isHighlighted={isHighlighted}
              taxBreakdown={{
                futaEmployer: record.futaEmployer,
              }}
              accruing={isAccruing}
            />
          )
        }

        if (taxType === "caPitSdi") {
          return (
            <TaxPaymentCard
              key={record._id}
              id={record._id}
              title={title}
              taxType={taxType}
              periodStart={record.periodStart}
              periodEnd={record.periodEnd}
              dueDate={record.dueDate}
              paidDate={record.paidDate}
              totalTax={record.totalTax}
              status={record.status}
              quarter={record.quarter}
              isHighlighted={isHighlighted}
              taxBreakdown={{
                caIncomeTax: record.caIncomeTax,
                caStateDisabilityIns: record.caStateDisabilityIns,
              }}
            />
          )
        }

        if (taxType === "caSuiEtt") {
          // CA SUI/ETT is quarterly - accruing if current date is within periodStart-periodEnd
          const now = new Date()
          const isAccruing =
            now >= new Date(record.periodStart) &&
            now <= new Date(record.periodEnd)

          return (
            <TaxPaymentCard
              key={record._id}
              id={record._id}
              title={title}
              taxType={taxType}
              periodStart={record.periodStart}
              periodEnd={record.periodEnd}
              dueDate={record.dueDate}
              paidDate={record.paidDate}
              totalTax={record.totalTax}
              status={record.status}
              quarter={record.quarter}
              isHighlighted={isHighlighted}
              taxBreakdown={{
                caSuiEmployer: record.caSuiEmployer,
                caEtt: record.caEtt,
              }}
              accruing={isAccruing}
            />
          )
        }

        return null
      })}
    </>
  )
}
