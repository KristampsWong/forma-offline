import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn, formatAmount } from "@/lib/utils"

function IndicatorDot({
  className,
  text,
  tooltip,
}: {
  className?: string
  text?: string
  tooltip?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex gap-2 items-center group relative hover:bg-accent/50 px-2 py-1 rounded-md cursor-default">
          <div className={cn("rounded-full w-2 h-2", className)}></div>
          <div className="font-medium text-sm">{text}</div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export type TaxSectionAmounts = {
  overdue: number
  mandatory: number
  optional?: number
}

interface TaxSectionHeaderProps {
  title: string
  amounts?: TaxSectionAmounts
  filings?: boolean
}

export default function TaxSectionHeader({
  title,
  amounts,
  filings = false,
}: TaxSectionHeaderProps) {
  const showOverdue = (amounts?.overdue ?? 0) > 0
  const showMandatory = (amounts?.mandatory ?? 0) > 0
  const hasData = amounts !== undefined

  // Payments: always show Optional when data exists; show overdue/mandatory when > 0
  // Filings: only show overdue indicator when overdue exists
  const shouldShow = filings ? showOverdue : hasData

  return (
    <div className="flex items-center justify-between h-7">
      <h2 className="uppercase font-medium text-muted-foreground">{title}</h2>

      {shouldShow && (
        <div className="flex">
          {showOverdue && (
            <IndicatorDot
              className="bg-red-400"
              text={`Overdue ${formatAmount(amounts?.overdue ?? 0, "currency")}`}
              tooltip="These were mandatory taxes and are now past due"
            />
          )}
          {!filings && showMandatory && (
            <IndicatorDot
              className="bg-yellow-400"
              text={`Mandatory ${formatAmount(amounts?.mandatory ?? 0, "currency")}`}
              tooltip="Must be paid by the due date to avoid interest."
            />
          )}
          {!filings && hasData && (
            <IndicatorDot
              className="bg-primary/10"
              text={`Optional ${formatAmount(amounts?.optional ?? 0, "currency")}`}
              tooltip="Not required now, but paying early is recommended."
            />
          )}
        </div>
      )}
    </div>
  )
}
