import { EllipsisVertical } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface PaycheckActionMenuProps {
  paycheckId: string
  approvalStatus: string

  variant?: "icon" | "text"
}

export default function PaycheckActionMenu({
  paycheckId,
  approvalStatus,
  variant = "text",
}: PaycheckActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({
            variant: variant === "text" ? "secondary" : "ghost",
            size: "sm",
          }),
          "focus-visible:ring-0 focus-visible:border-transparent",
        )}
      >
        {variant === "text" ? "Open" : <EllipsisVertical />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuItem className="capitalize" asChild>
          <Link
            href={`/pdf/payroll/${paycheckId}?type=paystub`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Print paystub
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem className="capitalize mb-1" asChild>
          <Link
            href={`/payroll/${paycheckId}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            Pay Details
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
