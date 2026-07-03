/**
 * Complete Form 941 field-name map, one full snapshot per PDF revision year.
 *
 * Every control the fill route writes to is listed here explicitly for each
 * year -- not just the ones that changed. This is deliberate: the IRS can
 * renumber ANY field in a future revision (a Medicare line, a date box, a
 * checkbox), and we don't want the fill route to assume which fields are
 * "stable". Because `Form941FieldMap` requires every key, TypeScript forces
 * each yearly map to be complete, and every name can be verified against that
 * year's real PDF (see lib/constants/pdf-forms/__tests__/form941-fields.test.ts).
 *
 * ## Adding a new revision year
 *
 * 1. Register the new PDF in ./index.ts (`availableYears` + `PdfFormYear`).
 * 2. Diff it against the previous year to see what moved:
 *      node scripts/inspect-pdf-fields.mjs \
 *        public/forms/941/<old>.pdf public/forms/941/<new>.pdf
 * 3. Add a full `FIELDS_<year>` snapshot below and register it in
 *    `FORM_941_FIELDS_BY_REVISION`. Copy the previous year and change only the
 *    field names the diff flagged. (A year whose PDF is byte-for-byte unchanged
 *    needs no entry -- the resolver reuses the most recent earlier revision.)
 * 4. Run the test to confirm every name exists in the new PDF.
 */

import { resolveByRevisionYear } from "./revision"

export interface Form941FieldMap {
  // --- Page 1: entity area ---
  /** EIN, first 2 digits. */
  einPart1: string
  /** EIN, remaining 7 digits. */
  einPart2: string
  companyName: string
  addressLine: string
  city: string
  state: string
  zip: string
  /** "Report for this Quarter" checkbox group -- append `[quarterIndex]`. */
  quarterCheckboxPrefix: string

  // --- Page 1: tax lines (currency lines are integer + decimal pairs) ---
  line1NumEmployees: string
  line2WagesInt: string
  line2WagesDec: string
  line3FitwInt: string
  line3FitwDec: string
  line5aSsWagesInt: string
  line5aSsWagesDec: string
  line5aSsTaxInt: string
  line5aSsTaxDec: string
  line5bSsTipsInt: string
  line5bSsTipsDec: string
  line5bSsTipsTaxInt: string
  line5bSsTipsTaxDec: string
  line5cMedWagesInt: string
  line5cMedWagesDec: string
  line5cMedTaxInt: string
  line5cMedTaxDec: string
  line5dAddlMedWagesInt: string
  line5dAddlMedWagesDec: string
  line5dAddlMedTaxInt: string
  line5dAddlMedTaxDec: string
  line5eTotalInt: string
  line5eTotalDec: string
  line6Int: string
  line6Dec: string
  line7Int: string
  line7Dec: string
  line10Int: string
  line10Dec: string
  line12Int: string
  line12Dec: string
  line13Int: string
  line13Dec: string
  line14Int: string
  line14Dec: string
  line15OverpaymentInt: string
  line15OverpaymentDec: string
  /** Line 15 "Send a refund" checkbox. */
  line15RefundCheckbox: string

  // --- Page 2 ---
  page2CompanyName: string
  page2EinPart1: string
  page2EinPart2: string
  /** Line 16 "line 12 < $2,500 / de minimis" checkbox. */
  line16SmallLiabilityCheckbox: string
  /** Line 16 "monthly schedule depositor" checkbox. */
  line16MonthlyCheckbox: string
  /** Line 16 "semiweekly schedule depositor" checkbox. */
  line16SemiweeklyCheckbox: string
  line16Month1Int: string
  line16Month1Dec: string
  line16Month2Int: string
  line16Month2Dec: string
  line16Month3Int: string
  line16Month3Dec: string
  line16TotalInt: string
  line16TotalDec: string
  /** Part 4 "No" third-party designee checkbox. */
  part4ThirdPartyNoCheckbox: string

  // --- Page 3: 941-V payment voucher ---
  voucherEinPart1: string
  voucherEinPart2: string
  /** Voucher tax-period checkbox group -- append `[quarterIndex]`. */
  voucherQuarterCheckboxPrefix: string
  voucherAmountInt: string
  voucherAmountDec: string
  voucherCompanyName: string
  voucherAddress: string
  voucherCityStateZip: string
}

const P1 = "topmostSubform[0].Page1[0]"
const ENTITY = `${P1}.Header[0].EntityArea[0]`
const P2 = "topmostSubform[0].Page2[0]"
const P3 = "topmostSubform[0].Page3[0]"

/** Form 941 (Rev. March 2024) -- the 2025 filing template. */
const FIELDS_2025: Form941FieldMap = {
  einPart1: `${ENTITY}.f1_1[0]`,
  einPart2: `${ENTITY}.f1_2[0]`,
  companyName: `${ENTITY}.f1_3[0]`,
  addressLine: `${ENTITY}.f1_5[0]`,
  city: `${ENTITY}.f1_6[0]`,
  state: `${ENTITY}.f1_7[0]`,
  zip: `${ENTITY}.f1_8[0]`,
  quarterCheckboxPrefix: `${P1}.Header[0].ReportForQuarter[0].c1_1`,

  line1NumEmployees: `${P1}.f1_12[0]`,
  line2WagesInt: `${P1}.f1_13[0]`,
  line2WagesDec: `${P1}.f1_14[0]`,
  line3FitwInt: `${P1}.f1_15[0]`,
  line3FitwDec: `${P1}.f1_16[0]`,
  line5aSsWagesInt: `${P1}.f1_17[0]`,
  line5aSsWagesDec: `${P1}.f1_18[0]`,
  line5aSsTaxInt: `${P1}.f1_19[0]`,
  line5aSsTaxDec: `${P1}.f1_20[0]`,
  line5bSsTipsInt: `${P1}.f1_21[0]`,
  line5bSsTipsDec: `${P1}.f1_22[0]`,
  line5bSsTipsTaxInt: `${P1}.f1_23[0]`,
  line5bSsTipsTaxDec: `${P1}.f1_24[0]`,
  line5cMedWagesInt: `${P1}.f1_25[0]`,
  line5cMedWagesDec: `${P1}.f1_26[0]`,
  line5cMedTaxInt: `${P1}.f1_27[0]`,
  line5cMedTaxDec: `${P1}.f1_28[0]`,
  line5dAddlMedWagesInt: `${P1}.f1_29[0]`,
  line5dAddlMedWagesDec: `${P1}.f1_30[0]`,
  line5dAddlMedTaxInt: `${P1}.f1_31[0]`,
  line5dAddlMedTaxDec: `${P1}.f1_32[0]`,
  line5eTotalInt: `${P1}.f1_33[0]`,
  line5eTotalDec: `${P1}.f1_34[0]`,
  line6Int: `${P1}.f1_37[0]`,
  line6Dec: `${P1}.f1_38[0]`,
  line7Int: `${P1}.f1_39[0]`,
  line7Dec: `${P1}.f1_40[0]`,
  line10Int: `${P1}.f1_45[0]`,
  line10Dec: `${P1}.f1_46[0]`,
  line12Int: `${P1}.f1_49[0]`,
  line12Dec: `${P1}.f1_50[0]`,
  line13Int: `${P1}.f1_51[0]`,
  line13Dec: `${P1}.f1_52[0]`,
  line14Int: `${P1}.f1_53[0]`,
  line14Dec: `${P1}.f1_54[0]`,
  line15OverpaymentInt: `${P1}.f1_55[0]`,
  line15OverpaymentDec: `${P1}.f1_56[0]`,
  line15RefundCheckbox: `${P1}.c1_3[1]`,

  page2CompanyName: `${P2}.Name_ReadOrder[0].f1_3[0]`,
  page2EinPart1: `${P2}.EIN_Number[0].f1_1[0]`,
  page2EinPart2: `${P2}.EIN_Number[0].f1_2[0]`,
  line16SmallLiabilityCheckbox: `${P2}.c2_1[0]`,
  line16MonthlyCheckbox: `${P2}.c2_1[1]`,
  line16SemiweeklyCheckbox: `${P2}.c2_1[2]`,
  line16Month1Int: `${P2}.f2_1[0]`,
  line16Month1Dec: `${P2}.f2_2[0]`,
  line16Month2Int: `${P2}.f2_3[0]`,
  line16Month2Dec: `${P2}.f2_4[0]`,
  line16Month3Int: `${P2}.f2_5[0]`,
  line16Month3Dec: `${P2}.f2_6[0]`,
  line16TotalInt: `${P2}.f2_7[0]`,
  line16TotalDec: `${P2}.f2_8[0]`,
  part4ThirdPartyNoCheckbox: `${P2}.c2_4[1]`,

  voucherEinPart1: `${P3}.EIN_Number[0].f1_1[0]`,
  voucherEinPart2: `${P3}.EIN_Number[0].f1_2[0]`,
  voucherQuarterCheckboxPrefix: `${P3}.Line3_ReadOrder[0].c3_1`,
  voucherAmountInt: `${P3}.f3_1[0]`,
  voucherAmountDec: `${P3}.f3_2[0]`,
  voucherCompanyName: `${P3}.f1_3[0]`,
  voucherAddress: `${P3}.f3_3[0]`,
  voucherCityStateZip: `${P3}.f3_4[0]`,
}

/**
 * Form 941 (Rev. March 2026). The Line 15 overpayment section gained a
 * direct-deposit refund block (15c-15e), which renumbered the refund checkbox
 * and shifted every 941-V voucher field. Only those names differ from 2025;
 * they are still written in full here so the snapshot stands on its own.
 */
const FIELDS_2026: Form941FieldMap = {
  einPart1: `${ENTITY}.f1_1[0]`,
  einPart2: `${ENTITY}.f1_2[0]`,
  companyName: `${ENTITY}.f1_3[0]`,
  addressLine: `${ENTITY}.f1_5[0]`,
  city: `${ENTITY}.f1_6[0]`,
  state: `${ENTITY}.f1_7[0]`,
  zip: `${ENTITY}.f1_8[0]`,
  quarterCheckboxPrefix: `${P1}.Header[0].ReportForQuarter[0].c1_1`,

  line1NumEmployees: `${P1}.f1_12[0]`,
  line2WagesInt: `${P1}.f1_13[0]`,
  line2WagesDec: `${P1}.f1_14[0]`,
  line3FitwInt: `${P1}.f1_15[0]`,
  line3FitwDec: `${P1}.f1_16[0]`,
  line5aSsWagesInt: `${P1}.f1_17[0]`,
  line5aSsWagesDec: `${P1}.f1_18[0]`,
  line5aSsTaxInt: `${P1}.f1_19[0]`,
  line5aSsTaxDec: `${P1}.f1_20[0]`,
  line5bSsTipsInt: `${P1}.f1_21[0]`,
  line5bSsTipsDec: `${P1}.f1_22[0]`,
  line5bSsTipsTaxInt: `${P1}.f1_23[0]`,
  line5bSsTipsTaxDec: `${P1}.f1_24[0]`,
  line5cMedWagesInt: `${P1}.f1_25[0]`,
  line5cMedWagesDec: `${P1}.f1_26[0]`,
  line5cMedTaxInt: `${P1}.f1_27[0]`,
  line5cMedTaxDec: `${P1}.f1_28[0]`,
  line5dAddlMedWagesInt: `${P1}.f1_29[0]`,
  line5dAddlMedWagesDec: `${P1}.f1_30[0]`,
  line5dAddlMedTaxInt: `${P1}.f1_31[0]`,
  line5dAddlMedTaxDec: `${P1}.f1_32[0]`,
  line5eTotalInt: `${P1}.f1_33[0]`,
  line5eTotalDec: `${P1}.f1_34[0]`,
  line6Int: `${P1}.f1_37[0]`,
  line6Dec: `${P1}.f1_38[0]`,
  line7Int: `${P1}.f1_39[0]`,
  line7Dec: `${P1}.f1_40[0]`,
  line10Int: `${P1}.f1_45[0]`,
  line10Dec: `${P1}.f1_46[0]`,
  line12Int: `${P1}.f1_49[0]`,
  line12Dec: `${P1}.f1_50[0]`,
  line13Int: `${P1}.f1_51[0]`,
  line13Dec: `${P1}.f1_52[0]`,
  line14Int: `${P1}.f1_53[0]`,
  line14Dec: `${P1}.f1_54[0]`,
  line15OverpaymentInt: `${P1}.f1_55[0]`,
  line15OverpaymentDec: `${P1}.f1_56[0]`,
  line15RefundCheckbox: `${P1}.c1_4[1]`,

  page2CompanyName: `${P2}.Name_ReadOrder[0].f1_3[0]`,
  page2EinPart1: `${P2}.EIN_Number[0].f1_1[0]`,
  page2EinPart2: `${P2}.EIN_Number[0].f1_2[0]`,
  line16SmallLiabilityCheckbox: `${P2}.c2_1[0]`,
  line16MonthlyCheckbox: `${P2}.c2_1[1]`,
  line16SemiweeklyCheckbox: `${P2}.c2_1[2]`,
  line16Month1Int: `${P2}.f2_1[0]`,
  line16Month1Dec: `${P2}.f2_2[0]`,
  line16Month2Int: `${P2}.f2_3[0]`,
  line16Month2Dec: `${P2}.f2_4[0]`,
  line16Month3Int: `${P2}.f2_5[0]`,
  line16Month3Dec: `${P2}.f2_6[0]`,
  line16TotalInt: `${P2}.f2_7[0]`,
  line16TotalDec: `${P2}.f2_8[0]`,
  part4ThirdPartyNoCheckbox: `${P2}.c2_4[1]`,

  voucherEinPart1: `${P3}.EIN_Number[0].f1_1[0]`,
  voucherEinPart2: `${P3}.EIN_Number[0].f1_2[0]`,
  voucherQuarterCheckboxPrefix: `${P3}.Line3_ReadOrder[0].c4_1`,
  voucherAmountInt: `${P3}.f4_2[0]`,
  voucherAmountDec: `${P3}.f4_3[0]`,
  voucherCompanyName: `${P3}.f1_3[0]`,
  voucherAddress: `${P3}.f4_5[0]`,
  voucherCityStateZip: `${P3}.f4_6[0]`,
}

/** One complete snapshot per PDF revision year (ascending). */
export const FORM_941_FIELDS_BY_REVISION: Record<number, Form941FieldMap> = {
  2025: FIELDS_2025,
  2026: FIELDS_2026,
}

/**
 * Resolve the complete 941 field map for a given PDF year. Pass the effective
 * PDF year from `getEffectiveFormYear("941", ...)`, not the raw tax year, so the
 * names always match the PDF actually loaded.
 */
export function getForm941Fields(year: number): Form941FieldMap {
  return resolveByRevisionYear(FORM_941_FIELDS_BY_REVISION, year)
}
