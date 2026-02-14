import { ReactNode } from "react"

import { LogowithWord } from "@/components/logo"
import { cn } from "@/lib/utils"
interface OnboardingLayoutProps {
  children : ReactNode
  className ?: string
}

export function OnboardingLayout({ children, className } : OnboardingLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen p-4">
      <LogowithWord />
      <div className={cn("flex-1 flex flex-col items-center justify-start", className)}>
        {children}
      </div>
    </div>
  )
}
