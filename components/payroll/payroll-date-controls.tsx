"use client"

import { useState } from "react"
import { formatDateParam, parseDateParam } from "@/lib/date/utils"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronDownIcon } from "lucide-react"
import { endOfMonth, startOfMonth } from "date-fns"
import { useRouter, useSearchParams } from "next/navigation"

interface PayPeriod {
  value: string
  label: string
}

function formatDisplayDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const year = date.getFullYear()
  return `${month}/${day}/${year}`
}

function generatePeriods(): Map<number, PayPeriod[]> {
  const START_YEAR = 2026
  const START_MONTH = 0 // January

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const periodsByYear = new Map<number, PayPeriod[]>()

  for (let year = START_YEAR; year <= currentYear; year++) {
    const monthStart = year === START_YEAR ? START_MONTH : 0
    const monthEnd = year === currentYear ? currentMonth : 11
    const periods: PayPeriod[] = []

    for (let month = monthStart; month <= monthEnd; month++) {
      const date = new Date(year, month, 1)
      const s = formatDateParam(startOfMonth(date))
      const e = formatDateParam(endOfMonth(date))
      const sDisplay = formatDisplayDate(startOfMonth(date))
      const eDisplay = formatDisplayDate(endOfMonth(date))

      periods.push({
        value: `${s}_${e}`,
        label: `${sDisplay}-${eDisplay}`,
      })
    }

    periodsByYear.set(year, periods)
  }

  return periodsByYear
}

export default function PayrollDateControls({
  disabled,
}: {
  disabled?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const start = searchParams.get("start") ?? ""
  const end = searchParams.get("end") ?? ""
  const payDate = searchParams.get("payDate") ?? ""

  const [payDateOpen, setPayDateOpen] = useState(false)

  const currentPeriodValue = start && end ? `${start}_${end}` : ""
  const selectedPayDate = parseDateParam(payDate) ?? undefined
  const periodsByYear = generatePeriods()

  function handlePeriodChange(value: string) {
    const [newStart, newEnd] = value.split("_")
    router.push(`/payroll?start=${newStart}&end=${newEnd}&payDate=${payDate}`)
  }

  function handlePayDateSelect(date: Date | undefined) {
    if (!date) return
    const p = formatDateParam(date)
    router.push(`/payroll?start=${start}&end=${end}&payDate=${p}`)
    setPayDateOpen(false)
  }

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <div className="flex flex-col gap-3">
        <Label htmlFor="pay-period" className="px-1">
          Pay period
        </Label>
        <Select
          value={currentPeriodValue}
          onValueChange={handlePeriodChange}
          disabled={disabled}
        >
          <SelectTrigger id="pay-period" className="w-60">
            <SelectValue placeholder="Select a pay period" />
          </SelectTrigger>
          <SelectContent>
            {[...periodsByYear.entries()].map(([year, periods]) => (
              <SelectGroup key={year}>
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                  {year}
                </div>
                {periods.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-3">
        <Label htmlFor="pay-date" className="px-1">
          Pay date
        </Label>
        <Popover open={payDateOpen} onOpenChange={setPayDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="pay-date"
              className="w-48 justify-between font-normal"
              disabled={disabled}
            >
              {selectedPayDate
                ? formatDisplayDate(selectedPayDate)
                : "Select date"}
              <ChevronDownIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedPayDate}
              captionLayout="dropdown"
              onSelect={handlePayDateSelect}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
