/**
 * Format EIN input to XX-XXXXXXX format
 * Automatically adds dash after 2 digits
 *
 * @example
 * formatEIN("12") => "12"
 * formatEIN("123") => "12-3"
 * formatEIN("123456789") => "12-3456789"
 * formatEIN("12-3456789") => "12-3456789" (already formatted)
 */
export function formatEIN(value : string) : string {
  // Remove all non-digit characters
  const digitsOnly = value.replace(/\D/g, "")

  // Limit to 9 digits max
  const truncated = digitsOnly.slice(0, 9)

  // Add dash after first 2 digits if we have more than 2 digits
  if (truncated.length <= 2) {
    return truncated
  }

  return `${truncated.slice(0, 2)}-${truncated.slice(2)}`
}

/**
 * Remove formatting from EIN (extract only digits)
 * Used when submitting to backend
 *
 * @example
 * unformatEIN("12-3456789") => "123456789"
 * unformatEIN("123456789") => "123456789"
 */
export function unformatEIN(value : string) : string {
  return value.replace(/\D/g, "")
}

/**
 * Validate EIN format (must be XX-XXXXXXX)
 *
 * @example
 * isValidEINFormat("12-3456789") => true
 * isValidEINFormat("123456789") => false
 * isValidEINFormat("12-34567") => false
 */
export function isValidEINFormat(value : string) : boolean {
  return /^\d{2}-\d{7}$/.test(value)
}
