/**
 * Shared payroll record builder — used by crud.ts and batch.ts
 * to construct denormalized payroll record objects.
 */
import type { IEmployee } from "@/models/employee"
import type { TaxCalculationResult } from "@/lib/payroll/types"

/**
 * Employee param accepts both Mongoose documents (ObjectId _id) and
 * lean docs (string _id) so crud.ts and batch.ts can both use this.
 */
interface BuildPayrollRecordParams {
  companyId: unknown
  employee: IEmployee & { _id: unknown }
  payPeriod: {
    periodType: string
    startDate: Date
    endDate: Date
    payDate: Date
  }
  hoursWorked: {
    regularHours: number
    overtimeHours: number
    totalHours: number
  }
  earnings: {
    regularPay: number
    overtimePay: number
    commissionPay: number
    bonusPay: number
    otherPay: number
    totalGrossPay: number
  }
  taxResult: TaxCalculationResult
}

export function buildPayrollRecord(params: BuildPayrollRecordParams) {
  const { companyId, employee, payPeriod, hoursWorked, earnings, taxResult } =
    params
  const { salary, payType, workingHours } = employee.currentCompensation

  return {
    companyId,
    employeeId: employee._id,
    employeeInfo: {
      firstName: employee.firstName,
      lastName: employee.lastName,
      middleName: employee.middleName,
      ssn: employee.ssn,
      email: employee.email,
    },
    payPeriod,
    hoursWorked: {
      regularHours: hoursWorked.regularHours,
      overtimeHours: hoursWorked.overtimeHours,
      doubleTimeHours: 0,
      sickHours: 0,
      vacationHours: 0,
      holidayHours: 0,
      totalHours: hoursWorked.totalHours,
    },
    compensation: {
      payType,
      payRate: salary,
      workingHours,
    },
    payMethod: employee.currentPayMethod.payMethod,
    federalW4: employee.currentFederalW4
      ? {
          formVersion: employee.currentFederalW4.formVersion,
          filingStatus: employee.currentFederalW4.filingStatus,
          multipleJobsOrSpouseWorks:
            employee.currentFederalW4.multipleJobsOrSpouseWorks,
          claimedDependentsDeduction:
            employee.currentFederalW4.claimedDependentsDeduction,
          otherIncome: employee.currentFederalW4.otherIncome,
          deductions: employee.currentFederalW4.deductions,
          extraWithholding: employee.currentFederalW4.extraWithholding,
          effectiveDate: employee.currentFederalW4.effectiveDate,
        }
      : undefined,
    californiaDE4: employee.currentStateTax?.californiaDE4
      ? {
          filingStatus: employee.currentStateTax.californiaDE4.filingStatus,
          worksheetA: employee.currentStateTax.californiaDE4.worksheetA,
          worksheetB: employee.currentStateTax.californiaDE4.worksheetB,
          additionalWithholding:
            employee.currentStateTax.californiaDE4.additionalWithholding,
          exempt: employee.currentStateTax.californiaDE4.exempt,
          wagesPlanCode: employee.currentStateTax.californiaDE4.wagesPlanCode,
          effectiveDate: employee.currentStateTax.californiaDE4.effectiveDate,
        }
      : undefined,
    taxExemptions: {
      futa: employee.taxExemptions?.futa || false,
      fica: employee.taxExemptions?.fica || false,
      suiEtt: employee.taxExemptions?.suiEtt || false,
      sdi: employee.taxExemptions?.sdi || false,
    },
    earnings,
    deductions: {
      preTax: {
        retirement401k: 0,
        healthInsurance: 0,
        dentalInsurance: 0,
        visionInsurance: 0,
        hsaFsa: 0,
        other: 0,
        total: 0,
      },
      taxes: taxResult.employeeTaxes,
      postTax: {
        garnishments: 0,
        unionDues: 0,
        charitableDonations: 0,
        other: 0,
        total: 0,
      },
    },
    employerTaxes: taxResult.employerTaxes,
    netPay: taxResult.netPay,
    approvalStatus: "pending",
  }
}
