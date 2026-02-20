"use client"

import { useEffect, useReducer, useRef } from "react"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import type { CompanyData } from "@/types/company"

import {
  dialogReducer,
  getCurrentSettingsSection,
  parseSettingsHash,
  updateSettingsHash,
} from "./dialog-config"
import { CompanyForm } from "./profile"
import SettingsNavigation, {
  SETTINGS_CONFIG,
  type SettingsSection,
} from "./settings-navigation"
import { StateRateSection } from "./state-rate-section"


export function SettingsDialogHost({
  companyData,
} : {
  companyData : CompanyData | null
}) {
  const [state, dispatch] = useReducer(dialogReducer, {
    isDialogOpen: false,
    isDropdownOpen: false,
    activeSection: SETTINGS_CONFIG.defaultSection,
  })
  const hasSyncedOnce = useRef(false)

  // Initialize dialog state from sessionStorage (onboarding) or URL hash (deep links)
  // Priority: sessionStorage > URL hash to ensure onboarding flow works correctly
  useEffect(() => {
    if (typeof window === "undefined") return

    // Check for deferred open requests from onboarding flow first
    const pendingSection = sessionStorage.getItem("openSettingsSection")
    if (pendingSection) {
      sessionStorage.removeItem("openSettingsSection")
      const section =
        pendingSection === "stateRate"
          ? "stateRate"
          : SETTINGS_CONFIG.defaultSection
      dispatch({ type: "OPEN_DIALOG", section })
      updateSettingsHash(section)
      return // Don't sync from hash if we have a pending section
    }

    // Otherwise, sync from URL hash for deep links
    const { shouldOpen, section } = parseSettingsHash(window.location.hash)
    dispatch({ type: "SYNC_FROM_URL", section, shouldOpen })
  }, [])

  // Listen for hash changes after initial mount
  useEffect(() => {
    if (typeof window === "undefined") return

    const syncFromHash = () => {
      const { shouldOpen, section } = parseSettingsHash(window.location.hash)
      dispatch({ type: "SYNC_FROM_URL", section, shouldOpen })
    }

    window.addEventListener("hashchange", syncFromHash)
    return () => window.removeEventListener("hashchange", syncFromHash)
  }, [])

  // Keep URL hash in sync with active section and close when cleared
  useEffect(() => {
    if (typeof window === "undefined") return

    // Avoid clearing the hash on the first render (important in React Strict Mode)
    if (!hasSyncedOnce.current) {
      hasSyncedOnce.current = true
      return
    }

    if (!state.isDialogOpen) {
      const { shouldOpen } = parseSettingsHash(window.location.hash)
      if (shouldOpen) {
        updateSettingsHash(null)
      }
      return
    }

    const currentSection = getCurrentSettingsSection()
    if (currentSection !== state.activeSection) {
      updateSettingsHash(state.activeSection)
    }
  }, [state.isDialogOpen, state.activeSection])

  const handleCloseDialog = () => {
    dispatch({ type: "CLOSE_DIALOG" })
  }

  const handleSectionChange = (section : SettingsSection) => {
    dispatch({ type: "CHANGE_SECTION", section })
  }

  return (
    <Dialog
      open={state.isDialogOpen}
      onOpenChange={(open) => {
        if (!open) handleCloseDialog()
      }}
    >
      <DialogContent className="sm:max-w-170 h-150 p-0" showCloseButton={false}>
        <div className="flex flex-col gap-2 sm:flex-row overflow-hidden">
          <SettingsNavigation
            activeSection={state.activeSection}
            onSectionChange={handleSectionChange}
            handleCloseDialog={handleCloseDialog}
          />
          <div className="bg-border h-full w-px" />
          <div className="flex-1 pl-2 pr-4 py-4 overflow-y-auto dark-scrollbar">
            {state.activeSection === "company" && (
              <CompanyForm
                companyData={companyData}
                onCloseAction={handleCloseDialog}
              />
            )}
            {state.activeSection === "stateRate" && companyData && (
              <StateRateSection
                currentUIRate={companyData.currentStateRate?.UIRate}
                currentETTRate={companyData.currentStateRate?.ETTRate}
                currentEDDAccountNumber={
                  companyData.currentStateRate?.eddAccountNumber
                }
                currentEffectiveDate={companyData.currentStateRate?.effectiveDate}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
