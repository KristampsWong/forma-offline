import { useCallback, useState, useTransition } from "react"
import { toast } from "sonner"

interface UseFormSubmissionOptions<TInput, TResult> {
  /**
   * The async action to perform on submission
   */
  action: (data: TInput) => Promise<TResult>

  /**
   * Success message to show in toast
   */
  successMessage?: string

  /**
   * Callback after successful submission
   */
  onSuccess?: (result: TResult) => void

  /**
   * Callback after failed submission
   */
  onError?: (error: string) => void
}

interface UseFormSubmissionReturn<TInput> {
  /**
   * Submit handler to be used with form.handleSubmit()
   */
  submit: (data: TInput) => Promise<void>

  /**
   * Whether the submission is in progress
   */
  isPending: boolean

  /**
   * Error message from the last submission
   */
  error: string | null

  /**
   * Clear the error state
   */
  clearError: () => void
}

/**
 * Hook for handling form submissions with loading state, toast notifications, and error handling
 *
 * @example
 * ```tsx
 * const { submit, isPending } = useFormSubmission({
 *   action: updateEmployee,
 *   successMessage: "Employee updated successfully",
 *   onSuccess: () => close(),
 * })
 *
 * return (
 *   <form onSubmit={form.handleSubmit(submit)}>
 *     <Button disabled={isPending}>
 *       {isPending ? "Saving..." : "Save"}
 *     </Button>
 *   </form>
 * )
 * ```
 */
export function useFormSubmission<
  TInput,
  TResult extends { success: boolean; error?: string } = {
    success: boolean
    error?: string
  },
>({
  action,
  successMessage,
  onSuccess,
  onError,
}: UseFormSubmissionOptions<TInput, TResult>): UseFormSubmissionReturn<TInput> {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const submit = useCallback(
    async (data: TInput) => {
      setError(null)

      startTransition(async () => {
        try {
          const result = await action(data)

          if (!result.success) {
            const errorMessage = result.error || "An error occurred"
            setError(errorMessage)
            toast.error(errorMessage)
            onError?.(errorMessage)
            return
          }

          if (successMessage) {
            toast.success(successMessage)
          }
          onSuccess?.(result)
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "An unexpected error occurred"
          setError(errorMessage)
          toast.error(errorMessage)
          onError?.(errorMessage)
        }
      })
    },
    [action, successMessage, onSuccess, onError]
  )

  return {
    submit,
    isPending,
    error,
    clearError,
  }
}
