"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
// import { markFilingAsFiled } from "@/actions/taxes/filling-update"
import { extractDateOnly } from "@/lib/date/utils"
import { getQuarterDates } from "@/lib/tax/deadlines"
import type {
  De9Status,
  Form940FilingStatus,
  Form941FilingStatus,
} from "@/lib/constants/tax-constants"
import type { Quarter, QuarterNumber } from "@/types/quarter"
import FilingCardBase from "./filing-card-base"

type FilingStatus =
  | Form941FilingStatus
  | Form940FilingStatus
  | De9Status

type TaxFilingCardProps = {
  id: string
  title: string
  formType: "941" | "940" | "de9" | "de9c"
  quarter?: Quarter | QuarterNumber // Quarter for 941, QuarterNumber for DE9/DE9C
  year: number
  periodStart?: string // ISO date string (optional for DE9/DE9C)
  periodEnd?: string // ISO date string (optional for DE9/DE9C)
  dueDate: string // ISO date string or formatted string for DE9/DE9C
  filingStatus: FilingStatus
  filedDate?: string | Date // ISO date string or Date
  confirmationNumber?: string
  amount: number
  overdue?: boolean
  isHighlighted?: boolean
}

export default function TaxFilingCard({
  id,
  title,
  formType,
  quarter,
  year,
  periodStart,
  periodEnd,
  dueDate,
  filingStatus,
  filedDate,
  amount,
  overdue = false,
  isHighlighted = false,
}: TaxFilingCardProps) {
  const [localFilingStatus, setLocalFilingStatus] =
    useState<FilingStatus>(filingStatus)
  const [localFiledDate, setLocalFiledDate] = useState<
    string | Date | undefined
  >(filedDate)
  const [showHighlight, setShowHighlight] = useState(isHighlighted)
  const router = useRouter()

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

  // Calculate period text and label based on form type
  let periodText: string
  let periodLabel: string
  let fileLink: string
  let periodStartDate: Date | undefined
  let periodEndDate: Date | undefined

  if (formType === "de9" || formType === "de9c") {
    // DE9/DE9C: quarter is a number (1-4), calculate dates from year and quarter
    const quarterNum = typeof quarter === "number" ? quarter : 1
    const { startDate, endDate } = getQuarterDates(year, quarterNum)
    periodStartDate = startDate
    periodEndDate = endDate
    periodText = `${extractDateOnly(startDate)} - ${extractDateOnly(endDate)}`
    periodLabel = `(Q${quarterNum})`
    fileLink = formType === "de9" ? `/pdf/de9/${id}` : `/pdf/de9c/${id}`
  } else {
    // Form 941/940: use provided periodStart/periodEnd
    periodStartDate = periodStart ? new Date(periodStart) : undefined
    periodEndDate = periodEnd ? new Date(periodEnd) : undefined
    periodText =
      periodStartDate && periodEndDate
        ? `${extractDateOnly(periodStartDate)} - ${extractDateOnly(periodEndDate)}`
        : ""
    periodLabel = typeof quarter === "string" ? `(${quarter})` : `(${year})`
    fileLink =
      formType === "941"
        ? `/api/forms/fill941?id=${id}`
        : `/api/forms/fill940?id=${id}`
  }

  const handleMarkFiled = () => {
    // return markFilingAsFiled(formType, id).then((res) => {
    //   if (res.success) {
    //     const nowIso = new Date().toISOString()
    //     setLocalFilingStatus("filed")
    //     setLocalFiledDate(nowIso)
    //     router.refresh()
    //   }
    //   return res
    // })

     console.log("Mark as filed clicked for", formType, id)
  }

  const filedDateToDisplay = localFiledDate ?? filedDate

  // Format filed date for display
  const formatFiledDate = (date: string | Date | undefined) => {
    if (!date) return undefined
    const dateObj = typeof date === "string" ? new Date(date) : date
    return `Filed ${extractDateOnly(dateObj)}`
  }

  // Format due date for display
  const formatDueDate = () => {
    // Try to parse as date first
    try {
      const dateObj = new Date(dueDate)
      if (!Number.isNaN(dateObj.getTime())) {
        return `Due ${extractDateOnly(dateObj)}`
      }
    } catch {
      // If parsing fails, return as is (for DE9 formatted strings like "01/31/2025")
    }
    return `Due ${dueDate}`
  }

  // Calculate accruing status - accruing if current date is within periodStart-periodEnd
  const now = new Date()
  const isAccruing =
    periodStartDate && periodEndDate
      ? now >= periodStartDate && now <= periodEndDate
      : false

  const isFiled = localFilingStatus === "filed"

  return (
    <FilingCardBase
      id={id}
      title={title}
      amount={amount}
      filedLabel={isFiled ? formatFiledDate(filedDateToDisplay) : undefined}
      dueLabel={formatDueDate()}
      periodLabel={`${periodText} ${periodLabel}`}
      previewHref={fileLink}
      status={isFiled ? "filed" : "pending"}
      overdue={overdue}
      isHighlighted={showHighlight}
      onCardClick={() => showHighlight && setShowHighlight(false)}
      onMarkFiled={handleMarkFiled}
      accruing={isAccruing}
      periodStart={periodStartDate}
      periodEnd={periodEndDate}
    />
  )
}
