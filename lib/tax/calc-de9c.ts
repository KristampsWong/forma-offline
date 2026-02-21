import { RoundingToCents } from "@/lib/payroll"

/**
 * Input data for DE9C calculation - a single payroll record
 */
export interface De9cPayrollInput {
  employeeId: string
  employeeInfo: {
    firstName: string
    lastName: string
    middleName?: string
    ssn: string
  }
  grossPay: number
  stateIncomeTax: number
  payPeriodEndDate: Date
}

/**
 * Employee row for DE9C form
 */
export interface De9cEmployeeCalcResult {
  ssn: string
  firstName: string
  mi: string
  lastName: string
  totalSubjectWages: string
  totalPitWages: string
  totalPitWithheld: string
  wageCode: string
}

/**
 * Result of DE9C calculation
 */
export interface De9cCalcResult {
  /** Employee list with wage details */
  employees: De9cEmployeeCalcResult[]
  /** Employee counts per month (Section A) */
  employeeCounts: {
    month1: number
    month2: number
    month3: number
  }
  /** Grand totals */
  grandTotals: {
    totalSubjectWages: string
    totalPitWages: string
    totalPitWithheld: string
  }
}

/**
 * Format SSN to XXX-XX-XXXX format
 */
export function formatSSN(ssn: string): string {
  const cleanSSN = ssn.replace(/\D/g, "")
  if (cleanSSN.length === 9) {
    return `${cleanSSN.slice(0, 3)}-${cleanSSN.slice(3, 5)}-${cleanSSN.slice(5)}`
  }
  return ssn
}

/**
 * Format amount to string with 2 decimal places
 */
export function formatDe9cAmount(amount: number): string {
  return RoundingToCents(amount).toFixed(2)
}

/**
 * Calculate DE9C form values from payroll data
 *
 * @param quarterPayrolls - Payroll records for the current quarter
 * @param year - Tax year
 * @param quarter - Quarter number (1-4)
 * @returns Calculated DE9C values including employee list and totals
 */
export function calcDe9c(
  quarterPayrolls: De9cPayrollInput[],
  year: number,
  quarter: number,
): De9cCalcResult {
  // Group payrolls by employee
  const employeePayrolls = new Map<
    string,
    {
      employeeInfo: {
        firstName: string
        lastName: string
        middleName?: string
        ssn: string
      }
      totalSubjectWages: number
      totalPitWages: number
      totalPitWithheld: number
    }
  >()

  // Track employee counts per month (Section A)
  const monthEmployeeSets = {
    month1: new Set<string>(),
    month2: new Set<string>(),
    month3: new Set<string>(),
  }

  // Calculate month boundaries for the quarter
  const month1Start = new Date(Date.UTC(year, (quarter - 1) * 3, 1))
  const month2Start = new Date(Date.UTC(year, (quarter - 1) * 3 + 1, 1))
  const month3Start = new Date(Date.UTC(year, (quarter - 1) * 3 + 2, 1))
  const month3End = new Date(Date.UTC(year, quarter * 3, 0)) // Last day of quarter

  for (const payroll of quarterPayrolls) {
    const employeeId = payroll.employeeId
    const grossPay = payroll.grossPay
    const pitWages = grossPay // PIT wages are typically the same as gross pay
    const pitWithheld = payroll.stateIncomeTax

    // Track which month this payroll belongs to (based on end date)
    const payEndDate = payroll.payPeriodEndDate
    if (payEndDate >= month1Start && payEndDate < month2Start) {
      monthEmployeeSets.month1.add(employeeId)
    } else if (payEndDate >= month2Start && payEndDate < month3Start) {
      monthEmployeeSets.month2.add(employeeId)
    } else if (payEndDate >= month3Start && payEndDate <= month3End) {
      monthEmployeeSets.month3.add(employeeId)
    }

    // Accumulate employee data
    if (!employeePayrolls.has(employeeId)) {
      employeePayrolls.set(employeeId, {
        employeeInfo: payroll.employeeInfo,
        totalSubjectWages: 0,
        totalPitWages: 0,
        totalPitWithheld: 0,
      })
    }

    const empData = employeePayrolls.get(employeeId)
    if (empData) {
      empData.totalSubjectWages += grossPay
      empData.totalPitWages += pitWages
      empData.totalPitWithheld += pitWithheld
    }
  }

  // Build employee list for DE9C
  const employees: De9cEmployeeCalcResult[] = []
  let grandTotalSubjectWages = 0
  let grandTotalPitWages = 0
  let grandTotalPitWithheld = 0

  for (const [, empData] of employeePayrolls) {
    employees.push({
      ssn: formatSSN(empData.employeeInfo.ssn),
      firstName: empData.employeeInfo.firstName,
      mi: empData.employeeInfo.middleName?.charAt(0) || "",
      lastName: empData.employeeInfo.lastName,
      totalSubjectWages: formatDe9cAmount(empData.totalSubjectWages),
      totalPitWages: formatDe9cAmount(empData.totalPitWages),
      totalPitWithheld: formatDe9cAmount(empData.totalPitWithheld),
      wageCode: "S", // Standard wage code
    })

    grandTotalSubjectWages += empData.totalSubjectWages
    grandTotalPitWages += empData.totalPitWages
    grandTotalPitWithheld += empData.totalPitWithheld
  }

  // Sort employees by last name, then first name
  employees.sort((a, b) => {
    const lastNameCompare = a.lastName.localeCompare(b.lastName)
    if (lastNameCompare !== 0) return lastNameCompare
    return a.firstName.localeCompare(b.firstName)
  })

  // Employee counts per month
  const employeeCounts = {
    month1: monthEmployeeSets.month1.size,
    month2: monthEmployeeSets.month2.size,
    month3: monthEmployeeSets.month3.size,
  }

  // Grand totals
  const grandTotals = {
    totalSubjectWages: formatDe9cAmount(grandTotalSubjectWages),
    totalPitWages: formatDe9cAmount(grandTotalPitWages),
    totalPitWithheld: formatDe9cAmount(grandTotalPitWithheld),
  }

  return {
    employees,
    employeeCounts,
    grandTotals,
  }
}
