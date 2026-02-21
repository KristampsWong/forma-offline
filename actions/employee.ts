"use server"

import { revalidatePath } from "next/cache"

import { requireAuth } from "@/lib/auth/auth-helpers"
import { COMPANY_ERRORS, EMPLOYEE_ERRORS } from "@/lib/constants/errors"
import { parseToUTCMidnight } from "@/lib/date/utils"
import dbConnect from "@/lib/db/dbConnect"
import { hashSSN } from "@/lib/encryption/ssn"
import { logger } from "@/lib/logger"
import {
  type CreateEmployeeInput,
  createEmployeeSchema,
  type GetEmployeeByIdInput,
  getEmployeeByIdSchema,
  type UpdateEmployeeCompensationInput,
  updateEmployeeCompensationSchema,
  type UpdateEmployeeEmploymentInput,
  updateEmployeeEmploymentSchema,
  type UpdateEmployeePersonalInput,
  updateEmployeePersonalSchema,
  type UpdateEmployeeTaxInput,
  updateEmployeeTaxSchema,
} from "@/lib/validation"
import Company from "@/models/company"
import Employee, { type EmployeeDocument } from "@/models/employee"
import Payroll from "@/models/payroll"
import type { EmployeeDetail, EmployeeListItem } from "@/types/employee"

// ============================================================
// Create
// ============================================================

export async function createEmployee(
  input: CreateEmployeeInput
): Promise<
  | { success: true; employee: { id: string; firstName: string; lastName: string; email: string } }
  | { success: false; error: string }
> {
  const { user } = await requireAuth()

  const parsed = createEmployeeSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" }
  }

  const { step1, step2 } = parsed.data

  // Parse dates (cheapest operations first, before DB access)
  const dateOfBirth = parseToUTCMidnight(step1.dateOfBirth)
  if (!dateOfBirth) {
    return { success: false, error: EMPLOYEE_ERRORS.INVALID_DOB_FORMAT(step1.dateOfBirth) }
  }

  const hireDate = parseToUTCMidnight(step1.hireDate)
  if (!hireDate) {
    return { success: false, error: EMPLOYEE_ERRORS.INVALID_HIRE_DATE_FORMAT(step1.hireDate) }
  }

  const parseNumber = (value: string | undefined): number => {
    if (!value || value === "") return 0
    return parseFloat(value)
  }

  await dbConnect()

  const company = await Company.findOne({ userId: user.id })
  if (!company) {
    return { success: false, error: COMPANY_ERRORS.NOT_FOUND }
  }

  // Check for duplicate email or SSN within company
  const ssnHashValue = hashSSN(step1.ssn)
  const existingEmployee = await Employee.findOne({
    companyId: company._id,
    $or: [{ email: step1.email }, { ssnHash: ssnHashValue }],
  })

  if (existingEmployee) {
    if (existingEmployee.email === step1.email) {
      return { success: false, error: EMPLOYEE_ERRORS.EMAIL_EXISTS }
    }
    return { success: false, error: EMPLOYEE_ERRORS.SSN_EXISTS }
  }

  const employee = await Employee.create({
    companyId: company._id,

    // Personal
    firstName: step1.firstName,
    middleName: step1.middleName || undefined,
    lastName: step1.lastName,
    ssn: step1.ssn,
    dateOfBirth,

    // Contact
    email: step1.email,
    phoneNumber: step1.phoneNumber || undefined,

    // Address
    address: {
      street1: step1.street1,
      street2: step1.street2 || undefined,
      city: step1.city,
      state: step1.state,
      zipCode: step1.zipCode,
    },

    workState: "CA",

    // Employment
    hireDate,
    employmentStatus: "active",
    employmentType: step1.employmentType,

    // Compensation
    currentCompensation: {
      salary: parseNumber(step1.currentSalary),
      payType: step1.payType,
      workingHours: step1.workingHours ? parseNumber(step1.workingHours) : 0,
      effectiveDate: hireDate,
    },
    currentPayMethod: {
      payMethod: step1.payMethod,
      effectiveDate: hireDate,
    },

    // Federal W-4
    currentFederalW4: {
      formVersion: step2.formVersion,
      filingStatus: step2.federalFilingStatus,
      multipleJobsOrSpouseWorks: step2.multipleJobsOrSpouseWorks,
      claimedDependentsDeduction: parseNumber(step2.claimedDependentsDeduction),
      otherIncome: parseNumber(step2.otherIncome),
      deductions: parseNumber(step2.deductions),
      extraWithholding: parseNumber(step2.extraWithholding),
      effectiveDate: hireDate,
      submittedDate: new Date(),
    },

    // State tax (CA DE-4)
    currentStateTax: {
      state: "CA",
      californiaDE4: {
        filingStatus: step2.stateFilingStatus,
        worksheetA: parseNumber(step2.regularAllowances),
        worksheetB: parseNumber(step2.estimatedAllowances),
        additionalWithholding: parseNumber(step2.stateAdditionalWithholding),
        exempt: step2.stateFilingStatus === "do_not_withhold",
        wagesPlanCode: step2.californiaWagesPlanCode,
        effectiveDate: hireDate,
        submittedDate: new Date(),
      },
      effectiveDate: hireDate,
    },

    // Tax exemptions
    taxExemptions: {
      futa: step2.futa,
      fica: step2.fica,
      suiEtt: step2.suiEtt,
      sdi: step2.sdi,
    },

    // Initial history records
    compensationHistory: [
      {
        salary: parseNumber(step1.currentSalary),
        payType: step1.payType,
        workingHours: step1.workingHours ? parseNumber(step1.workingHours) : 0,
        effectiveDate: hireDate,
        reason: "Initial hire",
      },
    ],
    payMethodHistory: [
      {
        payMethod: step1.payMethod,
        effectiveDate: hireDate,
        reason: "Initial hire",
      },
    ],
    federalW4History: [
      {
        formVersion: step2.formVersion,
        filingStatus: step2.federalFilingStatus,
        multipleJobsOrSpouseWorks: step2.multipleJobsOrSpouseWorks,
        claimedDependentsDeduction: parseNumber(step2.claimedDependentsDeduction),
        otherIncome: parseNumber(step2.otherIncome),
        deductions: parseNumber(step2.deductions),
        extraWithholding: parseNumber(step2.extraWithholding),
        effectiveDate: hireDate,
        submittedDate: new Date(),
        reason: "Initial W-4",
      },
    ],
    stateTaxHistory: [
      {
        state: "CA",
        californiaDE4: {
          filingStatus: step2.stateFilingStatus,
          worksheetA: parseNumber(step2.regularAllowances),
          worksheetB: parseNumber(step2.estimatedAllowances),
          additionalWithholding: parseNumber(step2.stateAdditionalWithholding),
          exempt: step2.stateFilingStatus === "do_not_withhold",
          wagesPlanCode: step2.californiaWagesPlanCode,
          effectiveDate: hireDate,
          submittedDate: new Date(),
        },
        effectiveDate: hireDate,
        reason: "Initial DE-4",
      },
    ],
  })

  revalidatePath("/employees")

  return {
    success: true,
    employee: {
      id: employee._id.toString(),
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
    },
  }
}

// ============================================================
// Read
// ============================================================

export async function getAllEmployees(): Promise<
  | { success: true; employees: EmployeeListItem[] }
  | { success: false; error: string }
> {
  const { user } = await requireAuth()

  await dbConnect()

  const company = await Company.findOne({ userId: user.id })
  if (!company) {
    return { success: false, error: COMPANY_ERRORS.NOT_FOUND }
  }

  const employees = await Employee.find({ companyId: company._id })
    .select("firstName lastName currentCompensation currentPayMethod employmentStatus")
    .lean()

  const employeeList: EmployeeListItem[] = employees.map((emp) => ({
    id: emp._id.toString(),
    firstName: emp.firstName,
    lastName: emp.lastName,
    currentCompensation: {
      salary: emp.currentCompensation.salary,
      payType: emp.currentCompensation.payType,
      workingHours: emp.currentCompensation.workingHours,
      effectiveDate: emp.currentCompensation.effectiveDate.toISOString(),
    },
    currentPayMethod: {
      payMethod: emp.currentPayMethod.payMethod,
      effectiveDate: emp.currentPayMethod.effectiveDate.toISOString(),
    },
    employmentStatus: emp.employmentStatus,
  }))

  return { success: true, employees: employeeList }
}

export async function getEmployeeById(
  input: GetEmployeeByIdInput
): Promise<
  | { success: true; employee: EmployeeDetail }
  | { success: false; error: string }
> {
  const { user } = await requireAuth()

  const parsed = getEmployeeByIdSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" }
  }

  const { employeeId } = parsed.data

  await dbConnect()

  const company = await Company.findOne({ userId: user.id })
  if (!company) {
    return { success: false, error: COMPANY_ERRORS.NOT_FOUND }
  }

  const employee: EmployeeDocument | null = await Employee.findOne({
    _id: employeeId,
    companyId: company._id,
  })

  if (!employee) {
    return { success: false, error: EMPLOYEE_ERRORS.NOT_FOUND }
  }

  const employeeDetail: EmployeeDetail = {
    id: employee._id.toString(),

    // Personal
    firstName: employee.firstName,
    middleName: employee.middleName || undefined,
    lastName: employee.lastName,
    ssnMasked: employee.ssnMasked,
    dateOfBirth: employee.dateOfBirth.toISOString(),
    email: employee.email,
    phoneNumber: employee.phoneNumber || undefined,

    // Address
    address: {
      street1: employee.address!.street1,
      street2: employee.address!.street2 || undefined,
      city: employee.address!.city,
      state: employee.address!.state,
      zipCode: employee.address!.zipCode,
    },

    // Employment
    workState: employee.workState,
    hireDate: employee.hireDate.toISOString(),
    employmentStatus: employee.employmentStatus,
    employmentType: employee.employmentType,
    department: employee.department || undefined,
    position: employee.position || undefined,

    // Compensation
    currentCompensation: {
      salary: employee.currentCompensation!.salary,
      payType: employee.currentCompensation!.payType,
      workingHours: employee.currentCompensation!.workingHours,
      effectiveDate: employee.currentCompensation!.effectiveDate.toISOString(),
    },
    payFrequency: company.payFrequency,
    currentPayMethod: {
      payMethod: employee.currentPayMethod!.payMethod,
      effectiveDate: employee.currentPayMethod!.effectiveDate.toISOString(),
    },

    // Federal W-4
    currentFederalW4: {
      formVersion: employee.currentFederalW4!.formVersion,
      filingStatus: employee.currentFederalW4!.filingStatus,
      multipleJobsOrSpouseWorks: employee.currentFederalW4!.multipleJobsOrSpouseWorks,
      claimedDependentsDeduction: employee.currentFederalW4!.claimedDependentsDeduction,
      otherIncome: employee.currentFederalW4!.otherIncome,
      deductions: employee.currentFederalW4!.deductions,
      extraWithholding: employee.currentFederalW4!.extraWithholding,
      effectiveDate: employee.currentFederalW4!.effectiveDate.toISOString(),
      submittedDate: employee.currentFederalW4!.submittedDate.toISOString(),
    },

    // State tax
    currentStateTax: {
      state: employee.currentStateTax!.state,
      californiaDE4: {
        filingStatus: employee.currentStateTax!.californiaDE4!.filingStatus,
        worksheetA: employee.currentStateTax!.californiaDE4!.worksheetA,
        worksheetB: employee.currentStateTax!.californiaDE4!.worksheetB,
        additionalWithholding: employee.currentStateTax!.californiaDE4!.additionalWithholding,
        exempt: employee.currentStateTax!.californiaDE4!.exempt,
        wagesPlanCode: employee.currentStateTax!.californiaDE4!.wagesPlanCode || "",
        effectiveDate: employee.currentStateTax!.californiaDE4!.effectiveDate.toISOString(),
        submittedDate: employee.currentStateTax!.californiaDE4!.submittedDate.toISOString(),
      },
      effectiveDate: employee.currentStateTax!.effectiveDate.toISOString(),
    },

    // Tax exemptions
    taxExemptions: {
      futa: employee.taxExemptions!.futa,
      fica: employee.taxExemptions!.fica,
      suiEtt: employee.taxExemptions!.suiEtt,
      sdi: employee.taxExemptions!.sdi,
    },

    // History
    compensationHistory: employee.compensationHistory.map((item) => ({
      salary: item.salary,
      payType: item.payType,
      workingHours: item.workingHours,
      effectiveDate: item.effectiveDate.toISOString(),
      reason: item.reason || undefined,
    })),
    payMethodHistory: employee.payMethodHistory.map((item) => ({
      payMethod: item.payMethod,
      effectiveDate: item.effectiveDate.toISOString(),
      reason: item.reason || undefined,
    })),
    federalW4History: employee.federalW4History.map((item) => ({
      formVersion: item.formVersion,
      filingStatus: item.filingStatus,
      multipleJobsOrSpouseWorks: item.multipleJobsOrSpouseWorks,
      claimedDependentsDeduction: item.claimedDependentsDeduction,
      otherIncome: item.otherIncome,
      deductions: item.deductions,
      extraWithholding: item.extraWithholding,
      effectiveDate: item.effectiveDate.toISOString(),
      submittedDate: item.submittedDate.toISOString(),
      reason: item.reason || undefined,
    })),
    stateTaxHistory: employee.stateTaxHistory.map((item) => ({
      state: item.state,
      californiaDE4: {
        filingStatus: item.californiaDE4!.filingStatus,
        worksheetA: item.californiaDE4!.worksheetA,
        worksheetB: item.californiaDE4!.worksheetB,
        additionalWithholding: item.californiaDE4!.additionalWithholding,
        exempt: item.californiaDE4!.exempt,
        wagesPlanCode: item.californiaDE4!.wagesPlanCode || "",
        effectiveDate: item.californiaDE4!.effectiveDate.toISOString(),
        submittedDate: item.californiaDE4!.submittedDate.toISOString(),
      },
      effectiveDate: item.effectiveDate.toISOString(),
      reason: item.reason || undefined,
    })),
  }

  return { success: true, employee: employeeDetail }
}

// ============================================================
// Update
// ============================================================

export async function updateEmployeePersonal(
  input: UpdateEmployeePersonalInput
): Promise<{ success: true } | { success: false; error: string }> {
  const { user } = await requireAuth()

  const parsed = updateEmployeePersonalSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" }
  }

  const { employeeId, data } = parsed.data

  const dateOfBirth = parseToUTCMidnight(data.dateOfBirth)
  if (!dateOfBirth) {
    return { success: false, error: EMPLOYEE_ERRORS.INVALID_DOB_FORMAT(data.dateOfBirth) }
  }

  await dbConnect()

  const company = await Company.findOne({ userId: user.id })
  if (!company) {
    return { success: false, error: COMPANY_ERRORS.NOT_FOUND }
  }

  // Check for duplicate email within company (exclude current employee)
  const existingEmployee = await Employee.findOne({
    companyId: company._id,
    email: data.email,
    _id: { $ne: employeeId },
  })

  if (existingEmployee) {
    return { success: false, error: EMPLOYEE_ERRORS.EMAIL_EXISTS }
  }

  const result = await Employee.findOneAndUpdate(
    { _id: employeeId, companyId: company._id },
    {
      $set: {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || undefined,
        email: data.email,
        phoneNumber: data.phoneNumber || undefined,
        dateOfBirth,
        address: {
          street1: data.street1,
          street2: data.street2 || undefined,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
        },
      },
    },
    { new: true }
  )

  if (!result) {
    return { success: false, error: EMPLOYEE_ERRORS.NOT_FOUND }
  }

  revalidatePath(`/employees/${employeeId}`)
  return { success: true }
}

export async function updateEmployeeEmployment(
  input: UpdateEmployeeEmploymentInput
): Promise<{ success: true } | { success: false; error: string }> {
  const { user } = await requireAuth()

  const parsed = updateEmployeeEmploymentSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" }
  }

  const { employeeId, data } = parsed.data

  const hireDate = parseToUTCMidnight(data.hireDate)
  if (!hireDate) {
    return { success: false, error: EMPLOYEE_ERRORS.INVALID_HIRE_DATE_FORMAT(data.hireDate) }
  }

  let terminationDate: Date | undefined
  if (data.terminationDate && data.terminationDate.trim().length > 0) {
    const parsedTerminationDate = parseToUTCMidnight(data.terminationDate)
    if (!parsedTerminationDate) {
      return {
        success: false,
        error: EMPLOYEE_ERRORS.INVALID_TERMINATION_DATE_FORMAT(data.terminationDate),
      }
    }
    terminationDate = parsedTerminationDate
  }

  await dbConnect()

  const company = await Company.findOne({ userId: user.id })
  if (!company) {
    return { success: false, error: COMPANY_ERRORS.NOT_FOUND }
  }

  const result = await Employee.findOneAndUpdate(
    { _id: employeeId, companyId: company._id },
    {
      $set: {
        hireDate,
        employmentStatus: data.employmentStatus,
        terminationDate: terminationDate || undefined,
        department: data.department || undefined,
        position: data.position || undefined,
      },
    },
    { new: true }
  )

  if (!result) {
    return { success: false, error: EMPLOYEE_ERRORS.NOT_FOUND }
  }

  revalidatePath(`/employees/${employeeId}`)
  return { success: true }
}

export async function updateEmployeeTax(
  input: UpdateEmployeeTaxInput
): Promise<{ success: true } | { success: false; error: string }> {
  const { user } = await requireAuth()

  const parsed = updateEmployeeTaxSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" }
  }

  const { employeeId, federalW4, stateDE4, taxExemptions } = parsed.data

  await dbConnect()

  const company = await Company.findOne({ userId: user.id })
  if (!company) {
    return { success: false, error: COMPANY_ERRORS.NOT_FOUND }
  }

  const employee = await Employee.findOne({
    _id: employeeId,
    companyId: company._id,
  })
  if (!employee) {
    return { success: false, error: EMPLOYEE_ERRORS.NOT_FOUND }
  }

  const now = new Date()
  const effectiveDate = new Date(now.toISOString().split("T")[0] + "T00:00:00.000Z")

  // Archive current settings to history (manual spread since subdoc interfaces lack toObject)
  const currentW4 = employee.currentFederalW4!
  const federalW4HistoryEntry = {
    formVersion: currentW4.formVersion,
    filingStatus: currentW4.filingStatus,
    multipleJobsOrSpouseWorks: currentW4.multipleJobsOrSpouseWorks,
    claimedDependentsDeduction: currentW4.claimedDependentsDeduction,
    otherIncome: currentW4.otherIncome,
    deductions: currentW4.deductions,
    extraWithholding: currentW4.extraWithholding,
    effectiveDate: currentW4.effectiveDate,
    submittedDate: currentW4.submittedDate,
    reason: "Updated via profile",
  }
  const currentStateTax = employee.currentStateTax!
  const stateTaxHistoryEntry = {
    state: currentStateTax.state,
    californiaDE4: currentStateTax.californiaDE4,
    effectiveDate: currentStateTax.effectiveDate,
    reason: "Updated via profile",
  }

  const result = await Employee.findOneAndUpdate(
    { _id: employeeId, companyId: company._id },
    {
      $set: {
        currentFederalW4: {
          formVersion: "w4_2020_or_later",
          filingStatus: federalW4.filingStatus,
          multipleJobsOrSpouseWorks: federalW4.multipleJobsOrSpouseWorks,
          claimedDependentsDeduction: federalW4.claimedDependentsDeduction,
          otherIncome: federalW4.otherIncome,
          deductions: federalW4.deductions,
          extraWithholding: federalW4.extraWithholding,
          effectiveDate,
          submittedDate: now,
        },
        currentStateTax: {
          state: "CA",
          californiaDE4: {
            filingStatus: stateDE4.filingStatus,
            worksheetA: stateDE4.worksheetA,
            worksheetB: stateDE4.worksheetB,
            additionalWithholding: stateDE4.additionalWithholding,
            exempt: stateDE4.exempt,
            wagesPlanCode: employee.currentStateTax!.californiaDE4!.wagesPlanCode,
            effectiveDate,
            submittedDate: now,
          },
          effectiveDate,
        },
        taxExemptions: {
          futa: taxExemptions.futa,
          fica: taxExemptions.fica,
          suiEtt: taxExemptions.suiEtt,
          sdi: taxExemptions.sdi,
        },
      },
      $push: {
        federalW4History: federalW4HistoryEntry,
        stateTaxHistory: stateTaxHistoryEntry,
      },
    },
    { new: true }
  )

  if (!result) {
    return { success: false, error: EMPLOYEE_ERRORS.FAILED_TO_UPDATE }
  }

  revalidatePath(`/employees/${employeeId}`)
  return { success: true }
}

export async function updateEmployeeCompensation(
  input: UpdateEmployeeCompensationInput
): Promise<{ success: true } | { success: false; error: string }> {
  const { user } = await requireAuth()

  const parsed = updateEmployeeCompensationSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" }
  }

  const { employeeId, data } = parsed.data

  await dbConnect()

  const company = await Company.findOne({ userId: user.id })
  if (!company) {
    return { success: false, error: COMPANY_ERRORS.NOT_FOUND }
  }

  const employee = await Employee.findOne({
    _id: employeeId,
    companyId: company._id,
  })
  if (!employee) {
    return { success: false, error: EMPLOYEE_ERRORS.NOT_FOUND }
  }

  const now = new Date()
  const effectiveDate = new Date(now.toISOString().split("T")[0] + "T00:00:00.000Z")

  // Archive current settings to history
  const compensationHistoryEntry = {
    salary: employee.currentCompensation!.salary,
    payType: employee.currentCompensation!.payType,
    workingHours: employee.currentCompensation!.workingHours,
    effectiveDate: employee.currentCompensation!.effectiveDate,
    reason: "Updated via profile",
  }
  const payMethodHistoryEntry = {
    payMethod: employee.currentPayMethod!.payMethod,
    effectiveDate: employee.currentPayMethod!.effectiveDate,
    reason: "Updated via profile",
  }

  const salary = parseFloat(data.salary)
  const workingHours = parseFloat(data.workingHours || "0")

  if (isNaN(salary) || salary <= 0) {
    return { success: false, error: "Invalid salary value" }
  }
  if (isNaN(workingHours) || workingHours < 0) {
    return { success: false, error: "Invalid working hours value" }
  }

  const result = await Employee.findOneAndUpdate(
    { _id: employeeId, companyId: company._id },
    {
      $set: {
        currentCompensation: {
          salary,
          payType: data.payType,
          workingHours,
          effectiveDate,
        },
        currentPayMethod: {
          payMethod: data.payMethod,
          effectiveDate,
        },
      },
      $push: {
        compensationHistory: compensationHistoryEntry,
        payMethodHistory: payMethodHistoryEntry,
      },
    },
    { new: true }
  )

  if (!result) {
    return { success: false, error: EMPLOYEE_ERRORS.FAILED_TO_UPDATE }
  }

  revalidatePath(`/employees/${employeeId}`)
  return { success: true }
}

// ============================================================
// Delete
// ============================================================

export async function deleteEmployee(
  employeeId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const { user } = await requireAuth()

  await dbConnect()

  const company = await Company.findOne({ userId: user.id })
  if (!company) {
    return { success: false, error: COMPANY_ERRORS.NOT_FOUND }
  }

  // Prevent deletion if employee has payroll records
  const hasPayrolls = await Payroll.exists({
    employeeId,
    companyId: company._id,
  })
  if (hasPayrolls) {
    return {
      success: false,
      error: "Cannot delete an employee with payroll records. Terminate them instead.",
    }
  }

  const result = await Employee.findOneAndDelete({
    _id: employeeId,
    companyId: company._id,
  })

  if (!result) {
    return { success: false, error: EMPLOYEE_ERRORS.NOT_FOUND }
  }

  revalidatePath("/employees")
  return { success: true }
}
