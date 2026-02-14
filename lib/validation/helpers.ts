import { z } from "zod"

/**
 * Helper function for Zod validation in server actions and form submissions
 * Returns a discriminated union for type-safe error handling
 *
 * @example
 * ```typescript
 * const result = validateInput(userSchema, input)
 * if (!result.success) {
 *   return { success: false, error: result.error }
 * }
 * // TypeScript knows result.data is validated
 * const { name, email } = result.data
 * ```
 */
export function validateInput<T>(
  schema : z.ZodSchema<T>,
  input : unknown
) : { success : true; data : T } | { success : false; error : string } {
  const validation = schema.safeParse(input)

  if (!validation.success) {
    // Return the first validation error message
    // If you need all errors, modify this to return validation.error.issues
    const errorMessage =
      validation.error.issues[0]?.message || "Invalid input data"
    return {
      success: false,
      error: errorMessage,
    }
  }

  return {
    success: true,
    data: validation.data,
  }
}

/**
 * Helper function to get all validation errors as an array
 * Useful for displaying multiple error messages in forms
 *
 * @example
 * ```typescript
 * const result = validateInputWithAllErrors(userSchema, input)
 * if (!result.success) {
 *   result.errors.forEach(error => toast.error(error))
 *   return
 * }
 * ```
 */
export function validateInputWithAllErrors<T>(
  schema : z.ZodSchema<T>,
  input : unknown
) :
  | { success : true; data : T }
  | { success : false; errors : string[]; errorsByField ?: Record<string, string> } {
  const validation = schema.safeParse(input)

  if (!validation.success) {
    const errors = validation.error.issues.map((issue) => issue.message)
    const errorsByField = validation.error.issues.reduce(
      (acc, issue) => {
        const path = issue.path.join(".")
        if (path) {
          acc[path] = issue.message
        }
        return acc
      },
      {} as Record<string, string>
    )

    return {
      success: false,
      errors,
      errorsByField,
    }
  }

  return {
    success: true,
    data: validation.data,
  }
}
