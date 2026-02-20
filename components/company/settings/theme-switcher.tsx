"use client"
import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import * as React from "react"

import { cn } from "@/lib/utils"

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-24 animate-pulse bg-muted rounded-lg" />
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Mode</h4>
      <div className="flex gap-2">
        {[
          { value: "light", icon: Sun, label: "Light" },
          { value: "dark", icon: Moon, label: "Dark" },
          { value: "system", icon: Monitor, label: "System" },
        ].map((mode) => (
          <button
            key={mode.value}
            type="button"
            onClick={() => setTheme(mode.value)}
            className={cn(
              "flex flex-1 flex-col items-center gap-2 rounded-lg border p-3 transition-colors",
              theme === mode.value
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-accent",
            )}
          >
            <mode.icon className="h-5 w-5" />
            <span className="text-xs">{mode.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
