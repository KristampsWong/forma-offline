"use client"

import { useState, useTransition } from "react"
import { extractDateOnly } from "@/lib/date/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ConfirmDialogProps {
  trigger: React.ReactNode
  type?: "filing" | "payment"
  accruing?: boolean
  periodStart?: Date
  periodEnd?: Date
  confirmLabel?: string
  cancelLabel?: string
  pendingLabel?: string
  onConfirm: () => Promise<void> | void
}

export default function ConfirmDialog({
  trigger,
  type = "filing",
  accruing = false,
  periodStart,
  periodEnd,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  pendingLabel = "Processing...",
  onConfirm,
}: ConfirmDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const handleConfirm = () => {
    startTransition(async () => {
      await onConfirm()
      setOpen(false)
    })
  }

  const title = accruing
    ? type === "filing"
      ? "This form isn't ready to file yet."
      : "This payment isn't ready yet."
    : type === "filing"
      ? "Mark as Filed"
      : "Confirm Payment"

  const description = accruing
    ? `The filing period is still open, so additional payroll activity may change the amounts.\n\nFiling Period: ${extractDateOnly(periodStart)}–${extractDateOnly(periodEnd)}`
    : "This action will trigger automatic quarter-end tax calculations and cannot be undone."

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="whitespace-pre-line">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="justify-end">
          <DialogClose asChild>
            <Button variant="outline">{cancelLabel}</Button>
          </DialogClose>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
