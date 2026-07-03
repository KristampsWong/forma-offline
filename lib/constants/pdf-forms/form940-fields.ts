/**
 * Complete Form 940 field-name map, one full snapshot per PDF revision year.
 *
 * Same model as form941-fields.ts: every control the fill route writes to is
 * listed explicitly for each year, so any field the IRS renumbers in a future
 * revision is captured by editing one line, and every name is verifiable
 * against the real PDF (see __tests__/form940-fields.test.ts).
 *
 * Forma is CA-only, so Schedule A only fills the California credit-reduction
 * row; the other states' boxes are left blank.
 *
 * ## Adding a new revision year (e.g. the IRS publishes the 2026 Form 940,
 *    usually late in the year)
 *
 * 1. Register the new PDF in ./index.ts (`availableYears["940"]` + PdfFormYear).
 * 2. Diff it against the previous year:
 *      node scripts/inspect-pdf-fields.mjs \
 *        public/forms/940/2025-sa.pdf public/forms/940/<new>-sa.pdf
 * 3. Add a full `FIELDS_<year>` snapshot below and register it in
 *    `FORM_940_FIELDS_BY_REVISION`, changing only the names the diff flagged.
 * 4. Run the test to confirm every name exists in the new PDF.
 */

import { resolveByRevisionYear } from "./revision"

export interface Form940FieldMap {
  // --- Header / entity area ---
  einPart1: string
  einPart2: string
  companyName: string
  addressLine: string
  city: string
  state: string
  zip: string

  // --- Part 1 ---
  /** Line 1a state abbreviation, first character. */
  line1aStateChar1: string
  /** Line 1a state abbreviation, second character. */
  line1aStateChar2: string
  /** Line 2 "paid wages in a credit reduction state" checkbox (CA/VI). */
  line2CreditReductionCheckbox: string

  // --- Part 2: FUTA tax before adjustments (int + dec pairs) ---
  line3Int: string
  line3Dec: string
  line5Int: string
  line5Dec: string
  line6Int: string
  line6Dec: string
  line7Int: string
  line7Dec: string
  line8Int: string
  line8Dec: string

  // --- Part 3: adjustments ---
  line9Int: string
  line9Dec: string
  line10Int: string
  line10Dec: string
  line11Int: string
  line11Dec: string

  // --- Part 4: totals ---
  line12Int: string
  line12Dec: string
  line13Int: string
  line13Dec: string
  line14Int: string
  line14Dec: string
  line15aOverpaymentInt: string
  line15aOverpaymentDec: string
  /** Line 15b "Send a refund" checkbox. */
  line15bRefundCheckbox: string

  // --- Part 5: quarterly FUTA liability (page 2) ---
  line16aQ1Int: string
  line16aQ1Dec: string
  line16bQ2Int: string
  line16bQ2Dec: string
  line16cQ3Int: string
  line16cQ3Dec: string
  line16dQ4Int: string
  line16dQ4Dec: string
  line17TotalInt: string
  line17TotalDec: string

  // --- Part 6 (page 2) ---
  /** Part 6 "No" third-party designee checkbox. */
  part6ThirdPartyNoCheckbox: string

  // --- 940-V payment voucher (page 3) ---
  voucherAmountInt: string
  voucherAmountDec: string

  // --- Schedule A: California credit-reduction row ---
  scheduleACaCheckbox: string
  scheduleACaFutaWagesInt: string
  scheduleACaFutaWagesDec: string
  scheduleACaReductionRate: string
  scheduleACaReductionAmountInt: string
  scheduleACaReductionAmountDec: string
  scheduleATotalReductionInt: string
  scheduleATotalReductionDec: string
}

const P1 = "topmostSubform[0].Page1[0]"
const ENTITY = `${P1}.EntityArea[0]`
const P2 = "topmostSubform[0].Page2[0]"
const P3 = "topmostSubform[0].Page3[0]"
const CA_ROW = `${P1}.Column1[0].BodyRow5[0]`

/** Form 940 (Rev. 2024) with Schedule A -- the 2025 filing template. */
const FIELDS_2025: Form940FieldMap = {
  einPart1: `${ENTITY}.f1_1[0]`,
  einPart2: `${ENTITY}.f1_2[0]`,
  companyName: `${ENTITY}.f1_3[0]`,
  addressLine: `${ENTITY}.f1_5[0]`,
  city: `${ENTITY}.f1_6[0]`,
  state: `${ENTITY}.f1_7[0]`,
  zip: `${ENTITY}.f1_8[0]`,

  line1aStateChar1: `${P1}.f1_12[0]`,
  line1aStateChar2: `${P1}.f1_13[0]`,
  line2CreditReductionCheckbox: `${P1}.c1_7[0]`,

  line3Int: `${P1}.f1_14[0]`,
  line3Dec: `${P1}.f1_15[0]`,
  line5Int: `${P1}.f1_18[0]`,
  line5Dec: `${P1}.f1_19[0]`,
  line6Int: `${P1}.f1_20[0]`,
  line6Dec: `${P1}.f1_21[0]`,
  line7Int: `${P1}.f1_22[0]`,
  line7Dec: `${P1}.f1_23[0]`,
  line8Int: `${P1}.f1_24[0]`,
  line8Dec: `${P1}.f1_25[0]`,

  line9Int: `${P1}.f1_26[0]`,
  line9Dec: `${P1}.f1_27[0]`,
  line10Int: `${P1}.f1_28[0]`,
  line10Dec: `${P1}.f1_29[0]`,
  line11Int: `${P1}.f1_30[0]`,
  line11Dec: `${P1}.f1_31[0]`,

  line12Int: `${P1}.f1_32[0]`,
  line12Dec: `${P1}.f1_33[0]`,
  line13Int: `${P1}.f1_34[0]`,
  line13Dec: `${P1}.f1_35[0]`,
  line14Int: `${P1}.f1_36[0]`,
  line14Dec: `${P1}.f1_37[0]`,
  line15aOverpaymentInt: `${P1}.f1_48[0]`,
  line15aOverpaymentDec: `${P1}.f1_49[0]`,
  line15bRefundCheckbox: `${P1}.c1_2[1]`,

  line16aQ1Int: `${P2}.f2_1[0]`,
  line16aQ1Dec: `${P2}.f2_2[0]`,
  line16bQ2Int: `${P2}.f2_3[0]`,
  line16bQ2Dec: `${P2}.f2_4[0]`,
  line16cQ3Int: `${P2}.f2_5[0]`,
  line16cQ3Dec: `${P2}.f2_6[0]`,
  line16dQ4Int: `${P2}.f2_7[0]`,
  line16dQ4Dec: `${P2}.f2_8[0]`,
  line17TotalInt: `${P2}.f2_9[0]`,
  line17TotalDec: `${P2}.f2_10[0]`,

  part6ThirdPartyNoCheckbox: `${P2}.c2_1[1]`,

  voucherAmountInt: `${P3}.f3_1[0]`,
  voucherAmountDec: `${P3}.f3_2[0]`,

  scheduleACaCheckbox: `${CA_ROW}.CAPostal[0].c1_5[0]`,
  scheduleACaFutaWagesInt: `${CA_ROW}.CAFUTA[0].f1_27[0]`,
  scheduleACaFutaWagesDec: `${CA_ROW}.CAFUTA[0].f1_28[0]`,
  scheduleACaReductionRate: `${CA_ROW}.CA_ReductionRate[0]`,
  scheduleACaReductionAmountInt: `${CA_ROW}.CAReduction[0].f1_29[0]`,
  scheduleACaReductionAmountDec: `${CA_ROW}.CAReduction[0].f1_30[0]`,
  scheduleATotalReductionInt: `${P1}.f1_223[0]`,
  scheduleATotalReductionDec: `${P1}.f1_224[0]`,
}

/** One complete snapshot per PDF revision year (ascending). */
export const FORM_940_FIELDS_BY_REVISION: Record<number, Form940FieldMap> = {
  2025: FIELDS_2025,
}

/**
 * Resolve the complete 940 field map for a given PDF year. Pass the effective
 * PDF year from `getEffectiveFormYear("940", ...)`, not the raw tax year, so the
 * names always match the PDF actually loaded.
 */
export function getForm940Fields(year: number): Form940FieldMap {
  return resolveByRevisionYear(FORM_940_FIELDS_BY_REVISION, year)
}
