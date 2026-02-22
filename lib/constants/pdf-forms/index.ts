import path from "node:path"
import { logger } from "@/lib/logger"
import type { PdfFormConfig, PdfFormType, PdfFormYear } from "./types"

export type { PdfFormConfig, PdfFormType, PdfFormYear } from "./types"

/**
 * Configuration for each form type
 * Maps form types to their folder and file suffix
 */
const formConfigs: Record<PdfFormType, PdfFormConfig> = {
  "940": {
    folder: "940",
    suffix: "-sa", // Schedule A variant for credit reduction states (CA)
  },
  "941": {
    folder: "941",
    suffix: "",
  },
  W4: {
    folder: "w4",
    suffix: "",
  },
}

/**
 * Registry of available PDF forms by form type and year
 * Add new years here as PDF templates become available
 */
const availableYears: Record<PdfFormType, PdfFormYear[]> = {
  "940": [2025],
  "941": [2025],
  W4: [2025],
}

/**
 * Get the file path for a PDF form template
 *
 * @param formType - The type of form ("940", "941", or "W4")
 * @param year - The tax year
 * @returns Absolute path to the PDF file
 *
 * @example
 * const pdfPath = getPdfFormPath("940", 2025)
 * // Returns: "/path/to/project/public/forms/940/2025-sa.pdf"
 */
export function getPdfFormPath(formType: PdfFormType, year: number): string {
  const config = formConfigs[formType]
  if (!config) {
    throw new Error(
      `Unknown form type: ${formType}. Available types: ${Object.keys(formConfigs).join(", ")}`,
    )
  }

  const effectiveYear = getEffectiveYear(formType, year)
  const filename = `${effectiveYear}${config.suffix}.pdf`

  return path.join(process.cwd(), "public", "forms", config.folder, filename)
}

/**
 * Get the effective year to use for a form
 * Falls back to most recent available year if requested year is not available
 */
function getEffectiveYear(formType: PdfFormType, year: number): number {
  const years = availableYears[formType]
  if (!years || years.length === 0) {
    throw new Error(`No PDF templates available for form type: ${formType}`)
  }

  // If the requested year is available, use it
  if (years.includes(year as PdfFormYear)) {
    return year
  }

  // Fall back to most recent available year
  const sortedYears = [...years].sort((a, b) => b - a)
  const mostRecentYear = sortedYears[0]

  if (year > mostRecentYear) {
    logger.warn(
      `PDF template for ${formType} ${year} not yet available, using ${mostRecentYear} template`,
    )
    return mostRecentYear
  }

  // For years older than available templates, use the oldest available
  const oldestYear = sortedYears[sortedYears.length - 1]
  logger.warn(
    `PDF template for ${formType} ${year} not available, using ${oldestYear} template`,
  )
  return oldestYear
}

/**
 * Check if a PDF form template is available for a specific year
 */
export function hasPdfFormForYear(
  formType: PdfFormType,
  year: number,
): boolean {
  const years = availableYears[formType]
  return years?.includes(year as PdfFormYear) ?? false
}

/**
 * Get all available years for a form type
 */
export function getAvailablePdfYears(formType: PdfFormType): PdfFormYear[] {
  return availableYears[formType] ?? []
}

/**
 * Get all supported form types
 */
export function getSupportedFormTypes(): PdfFormType[] {
  return Object.keys(formConfigs) as PdfFormType[]
}
