import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface FormAlertProps {
  icon?: ReactNode
  title?: string
  children: ReactNode
  className?: string
}

export function FormAlert({
  icon,
  title,
  children,
  className,
}: FormAlertProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-secondary p-3 text-sm text-secondary-foreground",
        className
      )}
    >
      {icon && <span className="inline mr-2 mb-1">{icon}</span>}
      {title && <p className="font-medium">{title}</p>}
      <p className={title ? "mt-1" : ""}>{children}</p>
    </div>
  )
}
