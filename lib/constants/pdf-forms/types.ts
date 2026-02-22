/**
 * PDF Form Template System
 *
 * Manages IRS/EDD PDF form templates used for filling employee tax forms.
 * Forms are stored as fillable PDFs in public/forms/{folder}/{year}{suffix}.pdf
 *
 * ## How It Works
 *
 * - Each form type has a folder, file suffix, and a list of available years
 * - `getPdfFormPath(formType, year)` resolves the file path for a given form and year
 * - If a year's template isn't available, the system falls back to the most recent year
 *   (e.g., W-4 2025 template reused for 2026/2027 until the IRS publishes a new one)
 *
 * ## Adding a New Year (e.g., IRS publishes updated 2027 Form 941)
 *
 * 1. Download the fillable PDF from irs.gov
 * 2. Place it at: public/forms/941/2027.pdf
 * 3. Add `2027` to the PdfFormYear union type below
 * 4. Add `2027` to `availableYears["941"]` array in index.ts
 * 5. If field names changed, update the corresponding route in app/api/forms/
 *
 * ## Forms That Don't Change Every Year
 *
 * Some forms (like W-4) stay the same across multiple years. In that case,
 * do NOT add a new year — the fallback mechanism will automatically reuse
 * the most recent template. Only add a new year when the actual PDF changes.
 *
 * ## Current File Structure
 *
 * public/forms/
 *   940/2025-sa.pdf    (Form 940 with Schedule A for credit reduction states)
 *   941/2025.pdf       (Form 941 quarterly)
 *   w4/2025.pdf        (Form W-4)
 */

export type PdfFormYear = 2025

export type PdfFormType = "940" | "941" | "W4"

/**
 * Configuration for a specific form type
 */
export interface PdfFormConfig {
  /** Folder name under public/forms/ */
  folder: string
  /** File suffix (e.g., "-sa" for Schedule A) */
  suffix: string
}
