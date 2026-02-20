import { useCallback, useState } from "react"
import type { FieldValues, UseFormReturn } from "react-hook-form"

interface UseDialogStateOptions<TFormValues extends FieldValues> {
  /**
   * React Hook Form instance - form will be reset when dialog closes
   */
  form?: UseFormReturn<TFormValues>

  /**
   * Default open state
   * @default false
   */
  defaultOpen?: boolean

  /**
   * Callback when dialog opens
   */
  onOpen?: () => void

  /**
   * Callback when dialog closes
   */
  onClose?: () => void
}

interface UseDialogStateReturn {
  /**
   * Current open state
   */
  isOpen: boolean

  /**
   * Open the dialog
   */
  open: () => void

  /**
   * Close the dialog
   */
  close: () => void

  /**
   * Toggle open state
   */
  toggle: () => void

  /**
   * Handler for controlled open state changes (for Sheet/Dialog onOpenChange)
   */
  handleOpenChange: (open: boolean) => void
}

/**
 * Hook for managing dialog/sheet open state with form reset support
 *
 * @example
 * ```tsx
 * const form = useForm<FormValues>({ ... })
 * const { isOpen, handleOpenChange, close } = useDialogState({ form })
 *
 * return (
 *   <Sheet open={isOpen} onOpenChange={handleOpenChange}>
 *     ...
 *   </Sheet>
 * )
 * ```
 */
export function useDialogState<TFormValues extends FieldValues = FieldValues>({
  form,
  defaultOpen = false,
  onOpen,
  onClose,
}: UseDialogStateOptions<TFormValues> = {}): UseDialogStateReturn {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const open = useCallback(() => {
    setIsOpen(true)
    onOpen?.()
  }, [onOpen])

  const close = useCallback(() => {
    setIsOpen(false)
    form?.reset()
    onClose?.()
  }, [form, onClose])

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev
      if (next) {
        onOpen?.()
      } else {
        form?.reset()
        onClose?.()
      }
      return next
    })
  }, [form, onOpen, onClose])

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        open()
      } else {
        close()
      }
    },
    [open, close]
  )

  return {
    isOpen,
    open,
    close,
    toggle,
    handleOpenChange,
  }
}
