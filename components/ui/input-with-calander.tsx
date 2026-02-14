"use client"

import { Input } from "@/components/ui/input"
import { formatDateInput, extractDateOnly } from "@/lib/date/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
interface DateFieldProps {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  name: string
  ref?: React.Ref<HTMLInputElement>
}

interface InputWithCalendarProps {
  field: DateFieldProps
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  "aria-invalid"?: boolean
}

export default function InputWithCalendar({
  field,
  placeholder = "MM/DD/YYYY",
  disabled,
  className,
  id,
  "aria-invalid": ariaInvalid,
}: InputWithCalendarProps) {
  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        aria-invalid={ariaInvalid}
        value={field.value || ""}
        onChange={(e) => field.onChange(formatDateInput(e.target.value))}
        onBlur={field.onBlur}
        name={field.name}
        ref={field.ref}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-9 w-9"
            type="button"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={field.value ? new Date(field.value) : undefined}
            onSelect={(date) => {
              if (date) {
                // Use extractDateOnly to ensure UTC consistency for payroll dates
                field.onChange(extractDateOnly(date)!)
              }
            }}
            disabled={(date) =>
              date > new Date() || date < new Date("1900-01-01")
            }
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
