import type { FormEventHandler, ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface SettingsDialogLayoutProps {
  title : string
  description ?: ReactNode
  onSubmit ?: FormEventHandler<HTMLFormElement>
  children : ReactNode
  isPending ?: boolean
  submitText ?: string
  onCancel ?: () => void
  error ?: string
  hideFooter ?: boolean
}

export function SettingsDialogLayout({
  title,
  description,
  onSubmit,
  children,
  isPending = false,
  submitText = "Save Changes",
  onCancel,
  error,
  hideFooter = false,
} : SettingsDialogLayoutProps) {
  // For sections without forms, render without form wrapper
  if (hideFooter) {
    return (
      <div className="space-y-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <span className="text-sm text-muted-foreground">{description}</span>
          )}
        </DialogHeader>
        <hr className="border-border" />
        {children}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && (
          <span className="text-sm text-muted-foreground">{description}</span>
        )}
      </DialogHeader>
      <hr className="border-border" />
      <form onSubmit={onSubmit} className="space-y-4">
        {children}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {onCancel ? (
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : submitText}
            </Button>
          </DialogFooter>
        ) : (
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : submitText}
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}
