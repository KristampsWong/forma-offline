"use client"

import * as React from "react"
import { Input } from "./input"
import { formatEIN } from "@/lib/format/ein"

export interface EINInputProps
  extends Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> {
  value?: string
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
}

/**
 * EIN Input with automatic formatting to XX-XXXXXXX format
 *
 * @example
 * ```tsx
 * <EINInput
 *   value={field.value}
 *   onChange={field.onChange}
 *   placeholder="12-3456789"
 * />
 * ```
 */
const EINInput = React.forwardRef<HTMLInputElement, EINInputProps>(
  ({ value = "", onChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = event.target.value
      const formatted = formatEIN(inputValue)

      // Create a new event with formatted value
      const formattedEvent = {
        ...event,
        target: {
          ...event.target,
          value: formatted,
        },
      } as React.ChangeEvent<HTMLInputElement>

      onChange?.(formattedEvent)
    }

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        maxLength={10} // XX-XXXXXXX = 10 characters
        placeholder="12-3456789"
        {...props}
      />
    )
  }
)

EINInput.displayName = "EINInput"

export { EINInput }
