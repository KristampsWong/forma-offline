import { ReactNode } from "react"

interface AuthCardProps {
  title : string
  description ?: ReactNode
  children ?: ReactNode
}

export function AuthCard({ title, description, children } : AuthCardProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-6 max-w-md min-w-sm mx-auto">
      <div className="text-center">
        <div className="text-3xl font-medium">{title}</div>
        {description && (
          <div className="text-muted-foreground text-sm pt-1">
            {description}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
