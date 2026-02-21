import * as React from "react"

import { cn } from "@/lib/utils"

interface AmountInputProps extends Omit<
  React.ComponentProps<"input">,
  "type" | "onChange" | "value"
> {
  value?: number
  onChange?: (value: number) => void
  prefix?: string
  suffix?: string
}

function AmountInput({
  className,
  value = 0,
  onChange,
  prefix,
  suffix,
  ...props
}: AmountInputProps) {
  const [displayValue, setDisplayValue] = React.useState(
    value ? String(value) : "",
  )

  // Sync from external value changes only.
  // During typing, Number(displayValue) always equals the parent value
  // (e.g. "12." → 12, "12.0" → 12), so this never fires mid-input.
  // It only fires on genuine external changes like resets.
  const displayNum = Number(displayValue) || 0
  if (value !== displayNum) {
    setDisplayValue(value ? String(value) : "")
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    if (raw === "" || /^\d*\.?\d{0,2}$/.test(raw)) {
      setDisplayValue(raw)
      onChange?.(Number(raw) || 0)
    }
  }

  return (
    <div>
      {prefix && <span className="mr-2">{prefix}</span>}
      <input
        type="text"
        inputMode="decimal"
        data-slot="amount-input"
        value={displayValue}
        placeholder="0.00"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className,
        )}
        onChange={handleChange}
        {...props}
      />
      {suffix && <span className="ml-2 text-muted-foreground">{suffix}</span>}
    </div>
  )
}

export { AmountInput }
export type { AmountInputProps }
