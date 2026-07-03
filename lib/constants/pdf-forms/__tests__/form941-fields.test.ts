/**
 * Verifies the per-year Form 941 field maps against the real PDF templates.
 *
 * The whole point of keeping a complete field snapshot per revision year (see
 * form941-fields.ts) is that every control can be checked, field-by-field and
 * year-by-year, against the actual PDF on disk. A single renumbered or mistyped
 * field name fails here instead of silently producing a blank box on a filing.
 */
import fs from "node:fs"
import { PDFDocument } from "pdf-lib"
import { describe, expect, it } from "vitest"
import { getPdfFormPath } from "@/lib/constants/pdf-forms"
import {
  FORM_941_FIELDS_BY_REVISION,
  type Form941FieldMap,
  getForm941Fields,
} from "@/lib/constants/pdf-forms/form941-fields"

/** Checkbox-group prefixes: `[quarterIndex]` is appended before lookup. */
const PREFIX_CHECKBOX_KEYS = new Set<keyof Form941FieldMap>([
  "quarterCheckboxPrefix",
  "voucherQuarterCheckboxPrefix",
])

/** Single checkboxes. */
const CHECKBOX_KEYS = new Set<keyof Form941FieldMap>([
  "line15RefundCheckbox",
  "line16SmallLiabilityCheckbox",
  "line16MonthlyCheckbox",
  "line16SemiweeklyCheckbox",
  "part4ThirdPartyNoCheckbox",
])

async function loadForm(year: number) {
  const bytes = fs.readFileSync(getPdfFormPath("941", year))
  const doc = await PDFDocument.load(bytes)
  return doc.getForm()
}

describe("Form 941 field maps match their PDF templates", () => {
  for (const [yearStr, map] of Object.entries(FORM_941_FIELDS_BY_REVISION)) {
    const year = Number(yearStr)

    it(`every field in the ${year} map resolves in the ${year} PDF`, async () => {
      const form = await loadForm(year)
      const missing: string[] = []

      for (const [key, name] of Object.entries(map) as [
        keyof Form941FieldMap,
        string,
      ][]) {
        try {
          if (PREFIX_CHECKBOX_KEYS.has(key)) {
            // Quarter groups have four boxes, one per quarter.
            for (let q = 0; q < 4; q++) form.getCheckBox(`${name}[${q}]`)
          } else if (CHECKBOX_KEYS.has(key)) {
            form.getCheckBox(name)
          } else {
            form.getTextField(name)
          }
        } catch {
          missing.push(`${key} -> ${name}`)
        }
      }

      expect(missing, `missing/mistyped fields in ${year}`).toEqual([])
    })
  }
})

describe("getForm941Fields resolves the right revision", () => {
  it("returns the exact revision when one exists", () => {
    expect(getForm941Fields(2025)).toBe(FORM_941_FIELDS_BY_REVISION[2025])
    expect(getForm941Fields(2026)).toBe(FORM_941_FIELDS_BY_REVISION[2026])
  })

  it("floors to the most recent earlier revision for future years", () => {
    expect(getForm941Fields(2027)).toBe(FORM_941_FIELDS_BY_REVISION[2026])
    expect(getForm941Fields(2030)).toBe(FORM_941_FIELDS_BY_REVISION[2026])
  })

  it("uses the earliest revision for years older than any template", () => {
    expect(getForm941Fields(2024)).toBe(FORM_941_FIELDS_BY_REVISION[2025])
  })

  it("distinguishes the 2026 refund/voucher renumbering from 2025", () => {
    // Guards the specific fields the 2026 revision moved.
    expect(getForm941Fields(2025).voucherAmountInt).toContain("f3_1")
    expect(getForm941Fields(2026).voucherAmountInt).toContain("f4_2")
    expect(getForm941Fields(2025).line15RefundCheckbox).toContain("c1_3")
    expect(getForm941Fields(2026).line15RefundCheckbox).toContain("c1_4")
  })
})
