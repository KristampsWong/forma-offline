import { SETTINGS_CONFIG, type SettingsSection } from "./settings-navigation"

type DialogState = {
  isDialogOpen : boolean
  isDropdownOpen : boolean
  activeSection : SettingsSection
}

type DialogAction =
  | { type : "OPEN_DIALOG"; section : SettingsSection }
  | { type : "CLOSE_DIALOG" }
  | { type : "TOGGLE_DROPDOWN"; isOpen : boolean }
  | { type : "CHANGE_SECTION"; section : SettingsSection }
  | { type : "SYNC_FROM_URL"; section : SettingsSection; shouldOpen : boolean }

export function dialogReducer(
  state : DialogState,
  action : DialogAction,
) : DialogState {
  switch (action.type) {
    case "OPEN_DIALOG":
      return {
        ...state,
        isDialogOpen: true,
        isDropdownOpen: false,
        activeSection: action.section,
      }
    case "CLOSE_DIALOG":
      return {
        ...state,
        isDialogOpen: false,
        isDropdownOpen: false,
      }
    case "TOGGLE_DROPDOWN":
      return {
        ...state,
        isDropdownOpen: action.isOpen,
      }
    case "CHANGE_SECTION":
      return {
        ...state,
        activeSection: action.section,
        isDialogOpen: true,
      }
    case "SYNC_FROM_URL":
      return {
        ...state,
        isDialogOpen: action.shouldOpen,
        activeSection: action.section,
        isDropdownOpen: false,
      }
    default:
      return state
  }
}

// ============================================================================
// URL Hash Utilities
// ============================================================================

export function parseSettingsHash(hash : string) : {
  shouldOpen : boolean
  section : SettingsSection
} {
  const normalized = hash.replace(/\/+$/, "")

  if (!normalized.startsWith(SETTINGS_CONFIG.baseHash)) {
    return { shouldOpen: false, section: SETTINGS_CONFIG.defaultSection }
  }

  const remainder = normalized.slice(SETTINGS_CONFIG.baseHash.length)

  // Hash is exactly "#settings"
  if (remainder === "") {
    return { shouldOpen: true, section: SETTINGS_CONFIG.defaultSection }
  }

  // Hash doesn't have proper format
  if (!remainder.startsWith("/")) {
    return { shouldOpen: false, section: SETTINGS_CONFIG.defaultSection }
  }

  const [sectionSlug] = remainder.slice(1).split("/")
  const section = SETTINGS_CONFIG.sections.find(
    (s) => s.hash === `#settings/${sectionSlug}`,
  )

  return {
    shouldOpen: true,
    section: section ? section.key : SETTINGS_CONFIG.defaultSection,
  }
}

export function updateSettingsHash(section : SettingsSection | null) {
  if (typeof window === "undefined") return

  const { pathname, search } = window.location
  const base = `${pathname}${search}`

  if (section === null) {
    window.history.replaceState(null, "", base)
    return
  }

  const sectionConfig = SETTINGS_CONFIG.sections.find((s) => s.key === section)
  const hash = sectionConfig?.hash ?? SETTINGS_CONFIG.baseHash

  window.history.replaceState(null, "", `${base}${hash}`)
}

export function getCurrentSettingsSection() : SettingsSection {
  if (typeof window === "undefined") return SETTINGS_CONFIG.defaultSection
  return parseSettingsHash(window.location.hash).section
}
