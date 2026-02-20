import type { TaxRates } from "@/lib/constants/tax-rates"
import { getTaxRates } from "@/lib/constants/tax-rates"
import type {
  CaliforniaTaxBracket,
  FederalTaxBracket,
} from "@/lib/constants/tax-table"
import {
  getCaliforniaTaxTables,
  getFederalTaxTables,
  getNumberOfPayPeriods,
} from "@/lib/constants/tax-table"
import type {
  CaliforniaDE4,
  PayrollCalculationInput,
  PayrollEmployeeData,
  TaxCalculationInput,
  TaxCalculationResult,
} from "@/lib/payroll/types"
import type { PayFrequency, PayType } from "@/lib/constants/employment-constants"
import type { FederalFilingStatus, StateFilingStatus } from "@/lib/constants/tax-constants"

// Re-export for convenience
export type { TaxRates }
export { getTaxRates }

export function calculateHours(
  workhours: number,
  period: {
    type: PayFrequency | "weekly" | "biweekly"
    startDate: Date
    endDate: Date
  },
) {
  switch (period.type) {
    case "weekly":
      return workhours
    case "biweekly":
      return workhours * 2
    case "monthly":
      return Math.round((workhours * 52) / 12)
    default: {
      const days =
        (period.endDate.getTime() - period.startDate.getTime()) /
          (1000 * 60 * 60 * 24) +
        1
      return Math.round((days / 7) * workhours)
    }
  }
}

export function calculateGrossPay(
  payRate: number,
  payPeriod: { type: PayFrequency | "weekly" | "biweekly" },
  payType: PayType,
  hours: number,
) {
  if (payType === "hourly") {
    return payRate * hours
  }
  if (payType === "yearly") {
    if (payPeriod.type === "monthly") return (payRate / 12) * hours
    if (payPeriod.type === "biweekly") return (payRate / 26) * hours
    if (payPeriod.type === "weekly") return (payRate / 52) * hours
  }
  return 0
}

/**
 * Calculate hourly rate from salary or hourly pay
 * For salary employees: annual salary / 52 weeks / 40 hours
 * For hourly employees: returns the hourly rate as-is
 */
export function calculateHourlyRate(
  salary: number,
  payType: PayType,
): number {
  if (payType === "hourly") {
    return salary
  }
  return salary / 52 / 40
}

/**
 * Federal income tax withholding calculation
 * @param grossPay - Gross pay for the period
 * @param payPeriod - Pay frequency (monthly, biweekly)
 * @param filingStatus - W-4 filing status
 * @param w4step2 - W-4 Step 2 checkbox (multiple jobs)
 * @param w4step3 - W-4 Step 3 (claimed dependents deduction)
 * @param w4step4a - W-4 Step 4a (other income)
 * @param w4step4b - W-4 Step 4b (deductions)
 * @param w4step4c - W-4 Step 4c (extra withholding)
 * @param taxRates - Optional tax rates (defaults to rates based on current year)
 */
export function federalWithholding(
  grossPay: number,
  payPeriod: PayFrequency,
  filingStatus: FederalFilingStatus,
  w4step2: boolean,
  w4step3: number,
  w4step4a: number,
  w4step4b: number,
  w4step4c: number,
  taxRates?: TaxRates,
) {
  if (filingStatus === "exempt") {
    return 0
  }

  // Get tax rates and tables for the specified year
  const rates = taxRates ?? getTaxRates(new Date())
  const tables = getFederalTaxTables(rates.year)
  const { standardDeduction } = rates.federal
  const period = getNumberOfPayPeriods({ type: payPeriod })
  /** step 1 */
  const annualizedIncome = grossPay * period /** 1C */

  const otherIncome = w4step4a

  const totalIncome = annualizedIncome + otherIncome /** 1E */

  let oneG = 0
  /** Standard deduction based on filing status
   * When w4step2 is unchecked, use full standard deduction from tax rates
   * When w4step2 IS checked, oneG remains 0 (no standard deduction, use different tax tables)
   */
  if (!w4step2) {
    switch (filingStatus) {
      case "single_or_married_separately":
        oneG = standardDeduction.single
        break
      case "married_jointly_or_qualifying_surviving":
        oneG = standardDeduction.marriedJointly
        break
      case "head_of_household":
        oneG = standardDeduction.headOfHousehold
        break
    }
  }

  const oneH = w4step4b + oneG

  const adjustedAnnualWageAmount = Math.max(totalIncome - oneH, 0) /* 1E - 1H */

  /** step 2 - Select appropriate tax table based on filing status and w4step2 */
  let taxTable: FederalTaxBracket[]
  if (filingStatus === "single_or_married_separately") {
    taxTable = w4step2 ? tables.singleStep2Checked : tables.single
  } else if (filingStatus === "married_jointly_or_qualifying_surviving") {
    taxTable = w4step2
      ? tables.marriedJointlyStep2Checked
      : tables.marriedJointly
  } else {
    // head_of_household
    taxTable = w4step2
      ? tables.headOfHouseholdStep2Checked
      : tables.headOfHousehold
  }

  const minusExemptions = taxTable.find(
    (item) =>
      adjustedAnnualWageAmount >= item.min &&
      adjustedAnnualWageAmount < item.max,
  ) /** It will get tentative(column c) and rate*/

  if (!minusExemptions) {
    throw new Error(
      "No matching tax bracket found for adjustedAnnualWageAmount",
    )
  }
  const tentativeAmount = minusExemptions.tentativeAmount

  const rate = minusExemptions.rate

  const excess = adjustedAnnualWageAmount - minusExemptions.min

  const twoF = excess * rate

  const twoG = tentativeAmount + twoF

  const tentvativeWithHolding =
    twoG / getNumberOfPayPeriods({ type: payPeriod })

  /** step 3 */
  const taxCredit = w4step3 / getNumberOfPayPeriods({ type: payPeriod })
  let remainingTax = tentvativeWithHolding - taxCredit

  if (remainingTax < 0) {
    remainingTax = 0
  }
  console.log("==========")
  /** step 4 */
  const finalFederalWithHolding = w4step4c + remainingTax
  console.log("Final", finalFederalWithHolding)
  let FIT = finalFederalWithHolding

  const CUSHION_CAP = 10
  const CUSHION_RATE = 0.01
  const cushion = Math.min(grossPay * CUSHION_RATE, CUSHION_CAP)
  console.log("cushion", cushion)
  // Cushion acts as a floor for low-income earners until IRS calculation exceeds it
  if (finalFederalWithHolding <= CUSHION_CAP) {
    FIT = Math.max(finalFederalWithHolding, cushion)
  }
  console.log("FIT at end", FIT)
  return RoundingToCents(FIT)
}

/**
 * @deprecated Use federalWithholding() instead
 */
export const federalWithholding2025 = federalWithholding

/**
 * California Tax withholding calculation
 * We dont support semi-monthly, weekly
 *
 * @param grossPay - Gross pay for the period
 * @param payPeriod - Pay frequency (monthly, biweekly)
 * @param filingStatus - DE-4 filing status
 * @param regularAllowances - Regular allowances (Worksheet A)
 * @param estimatedDeduction - Estimated deduction allowances (Worksheet B)
 * @param additionalWithHolding - Additional withholding amount
 * @param taxRates - Optional tax rates (defaults to rates based on current year)
 */
export function californiaWithholding(
  grossPay: number,
  payPeriod: PayFrequency,
  filingStatus: StateFilingStatus,
  regularAllowances = 1,
  estimatedDeduction: number /**1,2,3,4,5 */,
  additionalWithHolding: number,
  taxRates?: TaxRates,
) {
  // Get tax rates and tables for the specified year
  const rates = taxRates ?? getTaxRates(new Date())
  const tables = getCaliforniaTaxTables(rates.year)

  const getAllowanceFillingStatus = getCAAllowanceByFilingStatus(
    filingStatus,
    regularAllowances,
  )
  if (getAllowanceFillingStatus === "nonWithholding") {
    return 0
  }

  /** Step 1 - Check low income exemption */
  const lowIncomeExemption = tables.lowIncomeExemption.find(
    (item) => item.payrollPeriod === payPeriod.toUpperCase(),
  )?.[getAllowanceFillingStatus]
  const isLowIncome = grossPay <= (lowIncomeExemption || 0)

  if (isLowIncome) {
    return 0 /**if it is low income then return 0 */
  }

  /** Step 2 - Subtract estimated deduction allowance */
  const estimatedDeductionAllowance =
    tables.estimatedDeduction.find(
      (item) => item.allowances === estimatedDeduction,
    )?.[
      payPeriod.toLowerCase() as keyof Omit<
        (typeof tables.estimatedDeduction)[0],
        "allowances"
      >
    ] || 0
  const salariesSubjectToWithholding = grossPay - estimatedDeductionAllowance

  /** Step 3 - Subtract standard deduction to get taxable income */
  const standardDeductionValue =
    tables.standardDeduction.find(
      (item) => item.payrollPeriod === payPeriod.toUpperCase(),
    )?.[getAllowanceFillingStatus] || 0
  const taxableIncome = salariesSubjectToWithholding - standardDeductionValue

  /** Step 4 - Select appropriate tax bracket table based on pay period and filing status */
  let taxBracketTable: CaliforniaTaxBracket[]
  const periodTables =
    payPeriod === "monthly"
      ? tables.taxBrackets.monthly
      : tables.taxBrackets.biweekly

  if (filingStatus === "single_or_married(with_two_or_more_incomes)") {
    taxBracketTable = periodTables.single
  } else if (filingStatus === "married(one_income)") {
    taxBracketTable = periodTables.married
  } else {
    // head_of_household
    taxBracketTable = periodTables.headOfHousehold
  }

  const tableFive = taxBracketTable.find(
    (item) => taxableIncome >= item.min && taxableIncome < item.max,
  )
  if (!tableFive) {
    throw new Error("No matching tax bracket found for taxableIncome")
  }
  const taxableMinimum = tableFive.min || 0
  const rate = tableFive.rate || 0

  /** Step 5 - Calculate computed tax */
  const computedTax =
    (taxableIncome - taxableMinimum) * rate + tableFive.baseTax

  /** Step 6 - Subtract exemption allowances from computed tax */
  const allowanceValue =
    tables.exemptionAllowance.find(
      (row) => row.allowances === regularAllowances,
    )?.[
      payPeriod as keyof Omit<
        (typeof tables.exemptionAllowance)[0],
        "allowances"
      >
    ] || 0

  // California withholding cannot be negative before adding additional withholding
  const withholdingBeforeRounding = Math.max(0, computedTax - allowanceValue)

  const finalCaliforniaWithHolding =
    withholdingBeforeRounding + additionalWithHolding
  return RoundingToCents(finalCaliforniaWithHolding)
}

/**
 * @deprecated Use californiaWithholding() instead
 */
export const californiaWithholding2025 = californiaWithholding

/**
 * Calculate Federal Unemployment Tax (FUTA)
 * @param prevYTD - Year-to-date wages before this period
 * @param currentWage - Current period wages (gross pay)
 * @param taxRates - Optional tax rates for wage base limit and rate
 */
export function calcFUTA(
  prevYTD: number,
  currentWage: number,
  taxRates?: TaxRates,
): number {
  const rates = taxRates ?? getTaxRates(new Date())
  const futaLimit = rates.federal.futaLimit
  const futaRate = rates.federal.futaNetRate

  const taxableWage = Math.max(0, Math.min(futaLimit - prevYTD, currentWage))
  return RoundingToCents(taxableWage * futaRate)
}

/**
 * Calculate California State Unemployment Insurance (SUI)
 * @param prevYTD - Year-to-date wages before this period
 * @param currentWage - Current period wages (gross pay)
 * @param rate - Company-specific UI rate
 * @param taxRates - Optional tax rates for wage base limit
 */
function calcSUI(
  prevYTD: number,
  currentWage: number,
  rate = 0.034,
  taxRates?: TaxRates,
): number {
  const rates = taxRates ?? getTaxRates(new Date())
  const suiLimit = rates.california.suiLimit

  const taxable = Math.min(Math.max(suiLimit - prevYTD, 0), currentWage)
  return RoundingToCents(taxable * rate)
}

/**
 * Calculate California State Disability Insurance (SDI)
 * @param gross - Current period wages (gross pay)
 * @param taxRates - Optional tax rates for SDI rate
 */
function calcSDI(gross: number, taxRates?: TaxRates): number {
  const rates = taxRates ?? getTaxRates(new Date())
  const disability = gross * rates.california.sdiRate
  return RoundingToCents(disability)
}

/**
 * Calculate California Employment Training Tax (ETT)
 * @param gross - Current period wages (gross pay)
 * @param previousYTD - Year-to-date wages before this period
 * @param ettRate - Company-specific ETT rate
 * @param taxRates - Optional tax rates for wage base limit
 */
function calcETT(
  gross: number,
  previousYTD: number,
  ettRate = 0.001,
  taxRates?: TaxRates,
): number {
  const rates = taxRates ?? getTaxRates(new Date())
  const ettLimit = rates.california.ettLimit

  const taxableWage = Math.min(gross, Math.max(ettLimit - previousYTD, 0))
  return RoundingToCents(taxableWage * ettRate)
}

/**
 * Calculate California State Taxes: UI, ETT, SDI
 * @param wagePlanCode - DE-4 wage plan code (A, S, J, P)
 * @param prevYTD - Year-to-date wages before this period
 * @param gross - Current period wages (gross pay)
 * @param UIRate - Company-specific UI rate
 * @param ETTRate - Company-specific ETT rate
 * @param taxRates - Optional tax rates for wage base limits and SDI rate
 */
export function calcCAStateTaxes({
  wagePlanCode,
  prevYTD,
  gross,
  UIRate,
  ETTRate,
  taxRates,
}: {
  wagePlanCode: CaliforniaDE4["wagesPlanCode"]
  prevYTD: number
  gross: number
  UIRate: number
  ETTRate: number
  taxRates?: TaxRates
}) {
  let UI = 0
  let ETT = 0
  let SDI = 0

  switch (wagePlanCode) {
    case "A": // Agricultural
      UI = calcSUI(prevYTD, gross, UIRate, taxRates)
      ETT = calcETT(gross, prevYTD, ETTRate, taxRates)
      SDI = 0
      break
    case "S": // Standard
      UI = calcSUI(prevYTD, gross, UIRate, taxRates)
      ETT = calcETT(gross, prevYTD, ETTRate, taxRates)
      SDI = calcSDI(gross, taxRates)
      break
    case "J": // Household
      UI = calcSUI(prevYTD, gross, UIRate, taxRates)
      ETT = calcETT(gross, prevYTD, ETTRate, taxRates)
      SDI = calcSDI(gross, taxRates)
      break
    case "P": // Personal Services
      UI = 0
      ETT = 0
      SDI = calcSDI(gross, taxRates)
      break
  }

  return { UI, ETT, SDI }
}

/**
 * Calculate regular pay for an employee based on their pay type
 */
function calculateRegularPay(
  currentSalary: number,
  payType: PayType,
  periodType: PayFrequency,
): number {
  if (payType === "hourly") {
    return currentSalary // For hourly, currentSalary is the hourly rate
  }

  // For salary, divide by pay periods per year
  const periodsPerYear = periodType === "monthly" ? 12 : 26 // biweekly = 26
  return currentSalary / periodsPerYear
}

/**
 * Calculate payroll data for a single employee
 * This is the main function to use for payroll calculations
 */
export function calculatePayrollForEmployee(
  input: PayrollCalculationInput,
): PayrollEmployeeData {
  const weeklyHours = input.weeklyHours ?? 0

  // Calculate regular pay
  const regularPay = calculateRegularPay(
    input.currentSalary,
    input.payType,
    input.periodType,
  )

  // Calculate hours
  const hours = calculateHours(weeklyHours, {
    type: input.periodType,
    startDate: new Date(input.startDate),
    endDate: new Date(input.endDate),
  })

  // Calculate gross pay (pass raw rate, not regularPay which is already period-divided)
  const grossPay = calculateGrossPay(
    input.currentSalary,
    { type: input.periodType },
    input.payType,
    hours,
  )

  return {
    id: input.employeeId,
    name: `${input.firstName} ${input.lastName}`,
    regularPay,
    hours,
    grossPay,
    payType: input.payType,
  }
}

/**
 * Calculate Social Security tax
 * @param currentWages - Current period wages (gross pay)
 * @param ytdWages - Year-to-date wages before this period
 * @param taxRates - Optional tax rates (defaults to current year rates)
 */
export function calculateSocialSecurity(
  currentWages: number,
  ytdWages: number,
  taxRates?: TaxRates,
): number {
  const rates = taxRates ?? getTaxRates(new Date())
  const { socialSecurityWageBase, socialSecurityRate } = rates.federal

  if (ytdWages >= socialSecurityWageBase) {
    return 0
  }
  if (ytdWages + currentWages <= socialSecurityWageBase) {
    return RoundingToCents(currentWages * socialSecurityRate)
  }

  return RoundingToCents(
    (socialSecurityWageBase - ytdWages) * socialSecurityRate,
  )
}

/**
 * Calculate Medicare tax (employee or employer portion)
 * @param amount - Current period wages (gross pay)
 * @param taxRates - Optional tax rates (defaults to current year rates)
 */
export function calculateMedicare(amount: number, taxRates?: TaxRates): number {
  const rates = taxRates ?? getTaxRates(new Date())
  return RoundingToCents(amount * rates.federal.medicareRate)
}

/**
 * Calculate Additional Medicare tax for an employee (0.9% above $200k threshold)
 * Note: Only employee pays additional Medicare, employer does not match
 * @param currentWages - Current period wages (gross pay)
 * @param ytdWages - Year-to-date wages before this period
 * @param taxRates - Optional tax rates (defaults to current year rates)
 */
export function calculateAdditionalMedicare(
  currentWages: number,
  ytdWages: number,
  taxRates?: TaxRates,
): number {
  const rates = taxRates ?? getTaxRates(new Date())
  const { medicareAdditionalRate, medicareAdditionalThreshold } = rates.federal

  if (ytdWages >= medicareAdditionalThreshold) {
    return RoundingToCents(currentWages * medicareAdditionalRate)
  }
  if (ytdWages + currentWages <= medicareAdditionalThreshold) {
    return 0
  }
  return RoundingToCents(
    (ytdWages + currentWages - medicareAdditionalThreshold) *
      medicareAdditionalRate,
  )
}

export function RoundingToCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

export function getCAAllowanceByFilingStatus(
  filingStatus: StateFilingStatus,
  regularAllowances: number,
) {
  switch (filingStatus) {
    case "single_or_married(with_two_or_more_incomes)":
      return "singleOrDualIncome"
    case "married(one_income)":
      if (regularAllowances >= 2) {
        return "marriedAllowances2plus"
      }
      return "marriedAllowances0or1"
    case "head_of_household":
      return "unmarriedHeadOfHousehold"
    case "do_not_withhold":
      return "nonWithholding"
    default:
      return "nonWithholding"
  }
}

/**
 * Core tax calculation logic - Single Source of Truth
 * This is the central function that performs all tax calculations.
 * All other functions should call this to ensure consistency.
 *
 * IMPORTANT: This is the only place where tax calculation logic should exist.
 * Any changes to tax calculations must be made here.
 */
export function calculatePayrollTaxesCore(
  input: TaxCalculationInput,
): TaxCalculationResult {
  const {
    grossPay,
    periodType,
    ytdGrossPay,
    federalW4,
    stateTax,
    companyRates,
    taxExemptions,
    taxRates,
  } = input

  // Get tax rates - use provided rates or default to current date
  const rates = taxRates ?? getTaxRates(new Date())

  // ===== Employee Taxes =====

  // Federal income tax withholding
  const federalTax = federalW4
    ? federalWithholding(
        grossPay,
        periodType,
        federalW4.filingStatus,
        federalW4.multipleJobsOrSpouseWorks,
        federalW4.claimedDependentsDeduction,
        federalW4.otherIncome,
        federalW4.deductions,
        federalW4.extraWithholding,
        rates,
      )
    : 0

  // Social Security tax (check FICA exemption)
  const socialSecurityTax = taxExemptions?.fica
    ? 0
    : calculateSocialSecurity(grossPay, ytdGrossPay, rates)

  // Medicare tax (check FICA exemption)
  const medicareTax = taxExemptions?.fica
    ? 0
    : calculateMedicare(grossPay, rates)

  // Additional Medicare tax (for high earners, check FICA exemption)
  const additionalMedicareTax = taxExemptions?.fica
    ? 0
    : calculateAdditionalMedicare(grossPay, ytdGrossPay, rates)

  // California state income tax
  const stateIncomeTax =
    stateTax?.californiaDE4 && !stateTax.californiaDE4.exempt
      ? californiaWithholding(
          grossPay,
          periodType,
          stateTax.californiaDE4.filingStatus,
          stateTax.californiaDE4.worksheetA,
          stateTax.californiaDE4.worksheetB,
          stateTax.californiaDE4.additionalWithholding,
          rates,
        )
      : 0

  // California State Disability Insurance (SDI)
  const caStateTaxes = calcCAStateTaxes({
    wagePlanCode: stateTax?.californiaDE4?.wagesPlanCode,
    prevYTD: ytdGrossPay,
    gross: grossPay,
    UIRate: companyRates.UIRate,
    ETTRate: companyRates.ETTRate,
    taxRates: rates,
  })

  const sdi = taxExemptions?.sdi ? 0 : caStateTaxes.SDI

  // Total employee taxes
  const employeeTaxesTotal = RoundingToCents(
    federalTax +
      socialSecurityTax +
      medicareTax +
      additionalMedicareTax +
      stateIncomeTax +
      sdi,
  )

  // ===== Employer Taxes =====

  // Employer matching Social Security (check FICA exemption)
  const employerSocialSecurity = taxExemptions?.fica
    ? 0
    : calculateSocialSecurity(grossPay, ytdGrossPay, rates)

  // Employer matching Medicare (check FICA exemption)
  const employerMedicare = taxExemptions?.fica
    ? 0
    : calculateMedicare(grossPay, rates)

  // Federal Unemployment Tax (FUTA)
  const employerFUTA = taxExemptions?.futa
    ? 0
    : calcFUTA(ytdGrossPay, grossPay, rates)

  // California State Unemployment Insurance (SUI) and Employment Training Tax (ETT)
  const employerSUI = taxExemptions?.suiEtt ? 0 : caStateTaxes.UI
  const employerETT = taxExemptions?.suiEtt ? 0 : caStateTaxes.ETT

  // Total employer taxes
  const employerTaxesTotal = RoundingToCents(
    employerSocialSecurity +
      employerMedicare +
      employerFUTA +
      employerSUI +
      employerETT,
  )

  // Net pay
  const netPay = RoundingToCents(grossPay - employeeTaxesTotal)

  return {
    employeeTaxes: {
      federalIncomeTax: federalTax,
      socialSecurityTax: socialSecurityTax,
      medicareTax: medicareTax + additionalMedicareTax,
      stateIncomeTax: stateIncomeTax,
      localTax: 0, // No local tax in California
      sdi: sdi,
      total: employeeTaxesTotal,
    },
    employerTaxes: {
      socialSecurityTax: employerSocialSecurity,
      medicareTax: employerMedicare,
      futa: employerFUTA,
      sui: employerSUI,
      ett: employerETT,
      total: employerTaxesTotal,
    },
    netPay,
  }
}

/**
 * Calculate YTD + current payroll data
 * Combines the previous YTD data with current payroll earnings and taxes
 */
export function calculateYTDPlusCurrent(
  ytd: {
    salary: {
      regularPay: number
      overtimePay: number
      commissionPay: number
      otherPay: number
      totalGrossPay: number
    }
    totalFederalTax: number
    totalStateTax: number
    totalSocialSecurity: number
    totalMedicare: number
    totalSDI: number
    totalDeductions: number
    totalNetPay: number
    employerTotalFUTA: number
    employerTotalSocialSecurity: number
    employerTotalMedicare: number
    employerTotalCAETT: number
    employerTotalCASUI: number
    employerTotal: number
  },
  current: {
    earnings: {
      regularPay: number
      overtimePay: number
      commissionPay: number
      otherPay: number
      totalGrossPay: number
    }
    employeeTaxes: {
      federalIncomeTax: number
      stateIncomeTax: number
      socialSecurityTax: number
      medicareTax: number
      sdi: number
      total: number
    }
    employerTaxes: {
      futa: number
      socialSecurityTax: number
      medicareTax: number
      ett: number
      sui: number
      total: number
    }
    netPay: number
  },
) {
  return {
    salary: {
      regularPay: ytd.salary.regularPay + current.earnings.regularPay,
      overtimePay: ytd.salary.overtimePay + current.earnings.overtimePay,
      commissionPay: ytd.salary.commissionPay + current.earnings.commissionPay,
      otherPay: ytd.salary.otherPay + current.earnings.otherPay,
      totalGrossPay: ytd.salary.totalGrossPay + current.earnings.totalGrossPay,
    },
    totalFederalTax:
      ytd.totalFederalTax + current.employeeTaxes.federalIncomeTax,
    totalStateTax: ytd.totalStateTax + current.employeeTaxes.stateIncomeTax,
    totalSocialSecurity:
      ytd.totalSocialSecurity + current.employeeTaxes.socialSecurityTax,
    totalMedicare: ytd.totalMedicare + current.employeeTaxes.medicareTax,
    totalSDI: ytd.totalSDI + current.employeeTaxes.sdi,
    // totalDeductions = preTax + postTax deductions (not taxes)
    // NOTE: This function's signature doesn't include current.deductions.
    // When deductions are implemented, update signature and add:
    // current.deductions.preTax.total + current.deductions.postTax.total
    totalDeductions: ytd.totalDeductions,
    totalNetPay: ytd.totalNetPay + current.netPay,
    employerTotalFUTA: ytd.employerTotalFUTA + current.employerTaxes.futa,
    employerTotalSocialSecurity:
      ytd.employerTotalSocialSecurity + current.employerTaxes.socialSecurityTax,
    employerTotalMedicare:
      ytd.employerTotalMedicare + current.employerTaxes.medicareTax,
    employerTotalCAETT: ytd.employerTotalCAETT + current.employerTaxes.ett,
    employerTotalCASUI: ytd.employerTotalCASUI + current.employerTaxes.sui,
    employerTotal: ytd.employerTotal + current.employerTaxes.total,
  }
}
