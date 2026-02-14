import { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface OnboardingCardProps {
  title : string
  description ?: string
  align ?: "left" | "center"
  icon ?: ReactNode
  children ?: ReactNode
}

export function OnboardingCard({
  title,
  description,
  align = "left",
  icon,
  children,
} : OnboardingCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col w-full",
        align === "center"
          ? "items-center text-center space-y-8 max-w-md"
          : "items-start space-y-8 max-w-xl"
      )}
    >
      {icon && (
        <div className="rounded-full bg-muted p-4">
          {icon}
        </div>
      )}

      <div className="space-y-2.5">
        <div
          className={cn(
            "font-medium text-2xl",
            align === "center" && "text-center"
          )}
        >
          {title}
        </div>
        {description && (
          <div className="text-muted-foreground">{description}</div>
        )}
      </div>

      {children}
    </div>
  )
}
