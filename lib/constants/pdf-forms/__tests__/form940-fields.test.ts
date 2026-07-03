/**
 * Verifies the per-year Form 940 field maps against the real PDF templates.
 * See form940-fields.ts -- a single renumbered or mistyped field name fails
 * here instead of silently producing a blank box on a filing.
 */
import fs from "node:fs"
import { PDFDocument } from "pdf-lib"
import { describe, expect, it } from "vitest"
import { getPdfFormPath } from "@/lib/constants/pdf-forms"
import {
  FORM_940_FIELDS_BY_REVISION,
  type Form940FieldMap,
  getForm940Fields,
} from "@/lib/constants/pdf-forms/form940-fields"

/** Single checkboxes (everything else in the map is a text field). */
const CHECKBOX_KEYS = new Set<keyof Form940FieldMap>([
  "line2CreditReductionCheckbox",
  "line15bRefundCheckbox",
  "part6ThirdPartyNoCheckbox",
  "scheduleACaCheckbox",
])

async function loadForm(year: number) {
  const bytes = fs.readFileSync(getPdfFormPath("940", year))
  const doc = await PDFDocument.load(bytes)
  return doc.getForm()
}

describe("Form 940 field maps match their PDF templates", () => {
  for (const [yearStr, map] of Object.entries(FORM_940_FIELDS_BY_REVISION)) {
    const year = Number(yearStr)

    it(`every field in the ${year} map resolves in the ${year} PDF`, async () => {
      const form = await loadForm(year)
      const missing: string[] = []

      for (const [key, name] of Object.entries(map) as [
        keyof Form940FieldMap,
        string,
      ][]) {
        try {
          if (CHECKBOX_KEYS.has(key)) form.getCheckBox(name)
          else form.getTextField(name)
        } catch {
          missing.push(`${key} -> ${name}`)
        }
      }

      expect(missing, `missing/mistyped fields in ${year}`).toEqual([])
    })
  }
})

describe("getForm940Fields resolves the right revision", () => {
  it("returns the exact revision when one exists", () => {
    expect(getForm940Fields(2025)).toBe(FORM_940_FIELDS_BY_REVISION[2025])
  })

  it("floors to the most recent revision for years without a template", () => {
    // Until a 2026 Form 940 is published and registered, later years reuse 2025.
    expect(getForm940Fields(2026)).toBe(FORM_940_FIELDS_BY_REVISION[2025])
    expect(getForm940Fields(2030)).toBe(FORM_940_FIELDS_BY_REVISION[2025])
  })

  it("uses the earliest revision for years older than any template", () => {
    expect(getForm940Fields(2024)).toBe(FORM_940_FIELDS_BY_REVISION[2025])
  })
})
