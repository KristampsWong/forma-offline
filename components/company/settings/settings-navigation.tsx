"use client"

import {
  Building2,
  LogOut,
  Percent,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { signOut } from "@/lib/auth/auth-client"
import { logger } from "@/lib/logger"
import { cn } from "@/lib/utils"
export const SETTINGS_CONFIG = {
  baseHash: "#settings",
  defaultSection: "company" as SettingsSection,
  sections: [
    {
      key: "company" as SettingsSection,
      label: "Company",
      icon: Building2,
      hash: "#settings/company",
    },
    {
      key: "stateRate" as SettingsSection,
      label: "State Tax Rates",
      icon: Percent,
      hash: "#settings/state-rates",
    },
  ],
} as const
export type SettingsSection =
  | "company"
  | "stateRate"
  | "appearance"

export default function SettingsNavigation({
  activeSection,
  onSectionChange,
  handleCloseDialog,
} : {
  activeSection : SettingsSection
  onSectionChange : (section : SettingsSection) => void
  handleCloseDialog : () => void
}) {
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/sign-in")
    } catch (error) {
      logger.error("Sign out failed:", error)
      toast.error("Failed to sign out. Please try again.")
    }
  }

  return (
    <nav className="flex flex-row gap-1 sm:w-1/4 sm:flex-col pl-2">
      <button
        type="button"
        className="px-2 py-4 focus:outline-none"
        onClick={handleCloseDialog}
        aria-label="Close settings"
      >
        <X className="size-5" aria-hidden="true" />
      </button>

      {SETTINGS_CONFIG.sections.map((item) => {
        const isActive = activeSection === item.key
        return (
          <button
            key={item.key}
            type="button"
            className={cn(
              "rounded-md p-2 text-left text-sm font-medium hover:bg-accent hover:text-accent-foreground flex gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground",
            )}
            onClick={() => onSectionChange(item.key)}
            aria-current={isActive ? "page" : undefined}
          >
            <item.icon className="size-5" aria-hidden="true" />
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        )
      })}
      <button
        type="button"
        onClick={handleSignOut}
        className="my-2 p-2 font-medium text-sm text-destructive mt-auto hover:bg-secondary rounded-md flex gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <LogOut className="size-5" aria-hidden="true" />
        Sign Out
      </button>
    </nav>
  )
}
