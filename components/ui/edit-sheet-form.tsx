/**
 * EditSheetForm Component
 * Reusable sheet wrapper for edit forms with common patterns:
 * - Open/close state management
 * - Form state with validation
 * - Submit with loading state
 * - Success/error handling
 * - Auto-close on success
 */

"use client"

import type { ReactNode } from "react"
import type { FieldValues, UseFormReturn } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useDialogState } from "@/hooks/useDialogState"
import { useFormSubmission } from "@/hooks/useFormSubmission"

interface EditSheetFormProps<TFormValues extends FieldValues> {
  /**
   * Sheet title (e.g., "Edit Personal Details")
   */
  title: string

  /**
   * Sheet description (e.g., "Update employee information")
   */
  description?: string

  /**
   * Trigger button label
   * @default "Edit"
   */
  triggerLabel?: string

  /**
   * Trigger button variant
   * @default "secondary"
   */
  triggerVariant?: "default" | "secondary" | "outline" | "ghost"

  /**
   * Submit button label
   * @default "Save changes"
   */
  submitLabel?: string

  /**
   * React Hook Form instance
   */
  form: UseFormReturn<TFormValues>

  /**
   * Submit handler - called with form data when user clicks submit
   */
  onSubmit: (data: TFormValues) => Promise<{ success: boolean; error?: string }>

  /**
   * Success message to show in toast
   */
  successMessage: string

  /**
   * Form fields as children
   */
  children: ReactNode

  /**
   * Additional callback after successful submission
   */
  onSuccess?: () => void

  /**
   * Sheet content className
   */
  contentClassName?: string

  /**
   * Form className
   */
  formClassName?: string

  /**
   * Disable form inputs
   */
  disabled?: boolean
}

export function EditSheetForm<TFormValues extends FieldValues>({
  title,
  description,
  triggerLabel = "Edit",
  triggerVariant = "secondary",
  submitLabel = "Save changes",
  form,
  onSubmit,
  successMessage,
  children,
  onSuccess,
  contentClassName = "overflow-y-auto",
  formClassName = "space-y-4 px-4",
  disabled = false,
}: EditSheetFormProps<TFormValues>) {
  const { isOpen, handleOpenChange, close } = useDialogState({ form })

  const { submit, isPending } = useFormSubmission({
    action: onSubmit,
    successMessage,
    onSuccess: () => {
      close()
      onSuccess?.()
    },
  })

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant={triggerVariant} size="sm">
          {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent className={contentClassName}>
        <SheetHeader className="pb-0">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <form onSubmit={form.handleSubmit(submit)} className={formClassName}>
          {children}

          <SheetFooter className="px-0">
            <Button type="submit" disabled={isPending || disabled}>
              {isPending ? "Saving..." : submitLabel}
            </Button>
            <SheetClose asChild>
              <Button variant="outline" type="button" disabled={isPending}>
                Close
              </Button>
            </SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
