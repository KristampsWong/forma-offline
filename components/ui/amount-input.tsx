import * as React from "react"

import { cn } from "@/lib/utils"

interface AmountInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "onChange"> {
  prefix?: string
  suffix?: string
  onChange?: (value: string) => void
}

function AmountInput({
  className,
  prefix = "$",
  suffix,
  onChange,
  ...props
}: AmountInputProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    // Allow digits, one decimal point, and empty string
    if (raw === "" || /^\d*\.?\d{0,2}$/.test(raw)) {
      onChange?.(raw)
    }
  }

  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="pointer-events-none absolute left-3 text-muted-foreground text-sm">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="decimal"
        data-slot="amount-input"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          prefix ? "pl-7" : "px-3",
          suffix ? "pr-10" : "pr-3",
          className
        )}
        onChange={handleChange}
        {...props}
      />
      {suffix && (
        <span className="pointer-events-none ml-2 text-muted-foreground text-sm">
          {suffix}
        </span>
      )}
    </div>
  )
}

export { AmountInput }
export type { AmountInputProps }
