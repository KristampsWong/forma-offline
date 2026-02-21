"use client"

import { Check, CircleCheck } from "lucide-react"
import Link from "next/link"
import { useTransition } from "react"
import { toast } from "sonner"
import ConfirmDialog from "@/components/taxes/confirm-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn, formatAmount } from "@/lib/utils"
import { Badge } from "../ui/badge"

type FilingStatus = "filed" | "pending"

type FilingCardBaseProps = {
  id: string
  title: string
  amount: number
  filedLabel?: string
  dueLabel: string
  periodLabel: string
  previewHref: string
  status: FilingStatus
  onMarkFiled?: () => Promise<{ success: boolean; error?: string }>
  previewLabel?: string
  filedPreviewLabel?: string
  overdue?: boolean
  isHighlighted?: boolean
  showLeftStripe?: boolean
  onCardClick?: () => void
  instructionsHref?: string
  className?: string
  accruing?: boolean
  periodStart?: Date
  periodEnd?: Date
}

export default function FilingCardBase({
  id,
  title,
  amount,
  filedLabel,
  dueLabel,
  periodLabel,
  previewHref,
  status,
  onMarkFiled,
  previewLabel,
  filedPreviewLabel,
  overdue = false,
  isHighlighted = false,
  showLeftStripe = true,
  onCardClick,
  instructionsHref = "#",
  className,
  accruing = false,
  periodStart,
  periodEnd,
}: FilingCardBaseProps) {
  const [isPending, startTransition] = useTransition()

  const effectivePreviewLabel =
    status === "filed"
      ? (filedPreviewLabel ?? previewLabel ?? "View Filing")
      : (previewLabel ?? "Preview")

  const handleMarkFiled = async () => {
    if (!onMarkFiled) return

    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const res = await onMarkFiled()
        if (res?.success) {
          toast.success(`${title} marked as filed.`)
        } else {
          toast.error(res?.error || "Failed to update filing status.")
        }
        resolve()
      })
    })
  }

  return (
    <Card
      id={`tax-card-${id}`}
      onClick={onCardClick}
      className={cn(
        "p-4 gap-1 flex flex-row transition-all duration-500",
        isHighlighted && (overdue ? "ring-2 ring-red-400" : "ring-2 ring-ring"),
        className,
      )}
    >
      {showLeftStripe && (
        <span
          className={cn(
            "bg-transparent w-1 h-auto rounded-lg mr-2",
            overdue && "bg-red-400",
          )}
        />
      )}
      <div className="w-full space-y-2">
        <div className="flex items-start gap-4">
          <span className="font-medium flex-1 min-w-0">{title}</span>

          <div className="flex items-center gap-16 shrink-0">
            {status === "filed" && filedLabel ? (
              <div className="font-medium whitespace-nowrap">{filedLabel}</div>
            ) : (
              <div className="font-medium whitespace-nowrap">{dueLabel}</div>
            )}

            <div className="font-medium whitespace-nowrap w-64 text-end">
              {formatAmount(amount, "currency")}
            </div>

            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                {status !== "filed" ? (
                  <Link
                    href={previewHref}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "dark:text-white text-black",
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {effectivePreviewLabel}
                  </Link>
                ) : (
                  <div className="flex flex-col gap-2 items-end w-28">
                    <Badge variant="outline" className="text-xs">
                      <CircleCheck className="size-4 mr-1 inline-block fill-green-400 text-background" />
                      Filed
                    </Badge>
                  </div>
                )}
                {status !== "filed" && onMarkFiled && (
                  <ConfirmDialog
                    trigger={
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={isPending}
                      >
                        <Check className="dark:text-white text-black" />
                      </Button>
                    }
                    accruing={accruing}
                    periodStart={periodStart}
                    periodEnd={periodEnd}
                    confirmLabel="Confirm"
                    pendingLabel="Marking..."
                    onConfirm={handleMarkFiled}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">
            {periodLabel} {accruing && ` • Accruing`}
          </span>

          <Link
            href={status === "filed" ? previewHref : instructionsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground underline text-end mr-1"
          >
            {status === "filed" ? "View Filing" : "Filing Instructions"}
          </Link>
        </div>
      </div>
    </Card>
  )
}
