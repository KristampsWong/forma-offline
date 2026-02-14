import type React from "react"

import { cn } from "@/lib/utils"
export default function Header({
  title,
  children,
  className,
} : {
  title ?: string
  children ?: React.ReactNode
  className ?: string
}) {
  return (
    <header className={cn("flex items-center justify-between h-10", className)}>
      {title && <h1 className="text-2xl font-semibold">{title}</h1>}
      {children}
    </header>
  )
}
