import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type AmountFormat = "number" | "currency"

/**
 * Formats a numeric amount with proper thousands separators and decimal places
 *
 * @param amount - The amount to format (can be a number or string with commas)
 * @param format - The format type: "number" for plain formatting (e.g., "1,234.56")
 *                 or "currency" for USD currency formatting (e.g., "$1,234.56")
 * @returns Formatted string with 2 decimal places. Returns original value as string if not a valid number.
 *
 * @example
 * formatAmount(1234.5)                    // "1,234.50"
 * formatAmount(1234.5, "currency")        // "$1,234.50"
 * formatAmount("5000")                    // "5,000.00"
 * formatAmount("1,234.567", "currency")   // "$1,234.57"
 */
export function formatAmount(
  amount: number | string,
  format: AmountFormat = "number",
): string {
  const num = Number(String(amount).replace(/,/g, ""))
  if (!Number.isFinite(num)) return amount.toString()

  return num.toLocaleString("en-US", {
    ...(format === "currency"
      ? {
          style: "currency",
          currency: "USD",
        }
      : {}),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
