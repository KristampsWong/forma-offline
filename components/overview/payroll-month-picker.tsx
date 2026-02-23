"use client"

import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

const MIN_YEAR = 2025

export default function PayrollMonthPicker({
  month,
  year,
  onSelect,
}: {
  month: number
  year: number
  onSelect?: (month: number, year: number) => void
}) {
  const router = useRouter()
  const [viewYear, setViewYear] = useState(year)
  const [open, setOpen] = useState(false)

  const monthName = new Date(year, month).toLocaleString("en-US", {
    month: "long",
  })

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const handleMonthSelect = (selectedMonth: number) => {
    if (onSelect) {
      onSelect(selectedMonth, viewYear)
    } else {
      const monthStr = String(selectedMonth + 1).padStart(2, "0")
      router.push(`?month=${monthStr}&year=${viewYear}`, { scroll: false })
    }
    setOpen(false)
  }

  const handlePrevYear = () => {
    if (viewYear > MIN_YEAR) {
      setViewYear(viewYear - 1)
    }
  }

  const handleNextYear = () => {
    if (viewYear < currentYear) {
      setViewYear(viewYear + 1)
    }
  }

  const isMonthDisabled = (m: number) => {
    // Disable future months
    if (viewYear > currentYear) return true
    if (viewYear === currentYear && m > currentMonth) return true
    return false
  }

  const isMonthSelected = (m: number) => {
    return m === month && viewYear === year
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarIcon className="h-4 w-4" />
          {monthName} {year}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handlePrevYear}
            disabled={viewYear <= MIN_YEAR}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{viewYear}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleNextYear}
            disabled={viewYear >= currentYear}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((monthName, idx) => (
            <Button
              key={monthName}
              variant={isMonthSelected(idx) ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-8",
                isMonthDisabled(idx) && "opacity-50 cursor-not-allowed",
              )}
              disabled={isMonthDisabled(idx)}
              onClick={() => handleMonthSelect(idx)}
            >
              {monthName}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
