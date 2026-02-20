"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

import { updateEmployeeTax } from "@/actions/employee"
import { W4FormFields } from "@/components/employee/W4FormFields"
import { EditSheetForm } from "@/components/ui/edit-sheet-form"
import { type CompleteW4Form, completeW4Schema } from "@/lib/validation"
import type { EmployeeDetail } from "@/types/employee"

interface TaxWithholdingSheetProps {
  employee: EmployeeDetail
  onUpdate?: () => void
}

/**
 * Map employee data to flat CompleteW4Form structure
 * This allows reusing W4FormFields component
 * DB values match form constants - no mapping needed
 */
function getFormDefaults(employee: EmployeeDetail): CompleteW4Form {
  return {
    // Form Version
    formVersion: "w4_2020_or_later",

    // Federal Withholding (flat)
    federalFilingStatus:
      employee.currentFederalW4?.filingStatus || "single_or_married_separately",
    multipleJobsOrSpouseWorks:
      employee.currentFederalW4?.multipleJobsOrSpouseWorks || false,
    claimedDependentsDeduction: String(
      employee.currentFederalW4?.claimedDependentsDeduction || 0
    ),
    otherIncome: String(employee.currentFederalW4?.otherIncome || 0),
    deductions: String(employee.currentFederalW4?.deductions || 0),
    extraWithholding: String(employee.currentFederalW4?.extraWithholding || 0),

    // State Withholding (flat)
    stateFilingStatus:
      employee.currentStateTax?.californiaDE4?.filingStatus ||
      "single_or_married(with_two_or_more_incomes)",
    regularAllowances: String(
      employee.currentStateTax?.californiaDE4?.worksheetA || 1
    ),
    estimatedAllowances: String(
      employee.currentStateTax?.californiaDE4?.worksheetB || 0
    ),
    stateAdditionalWithholding: String(
      employee.currentStateTax?.californiaDE4?.additionalWithholding || 0
    ),

    // California Wage Plan Code
    californiaWagesPlanCode:
      employee.currentStateTax?.californiaDE4?.wagesPlanCode || "A",

    // Tax Exemptions (flat)
    futa: employee.taxExemptions?.futa || false,
    fica: employee.taxExemptions?.fica || false,
    suiEtt: employee.taxExemptions?.suiEtt || false,
    sdi: employee.taxExemptions?.sdi || false,
  }
}

/**
 * Safe parseFloat that returns 0 for NaN values
 */
function safeParseFloat(value: string | undefined): number {
  const parsed = parseFloat(value || "0")
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Safe parseInt that returns 0 for NaN values
 */
function safeParseInt(value: string | undefined): number {
  const parsed = parseInt(value || "0", 10)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Transform flat form data to nested structure for server action
 * Values are passed directly - no mapping needed
 */
function transformToServerInput(data: CompleteW4Form) {
  return {
    federalW4: {
      filingStatus: data.federalFilingStatus,
      multipleJobsOrSpouseWorks: data.multipleJobsOrSpouseWorks,
      claimedDependentsDeduction: safeParseFloat(data.claimedDependentsDeduction),
      otherIncome: safeParseFloat(data.otherIncome),
      deductions: safeParseFloat(data.deductions),
      extraWithholding: safeParseFloat(data.extraWithholding),
    },
    stateDE4: {
      filingStatus: data.stateFilingStatus,
      worksheetA: safeParseInt(data.regularAllowances),
      worksheetB: safeParseInt(data.estimatedAllowances),
      additionalWithholding: safeParseFloat(data.stateAdditionalWithholding),
      exempt: data.stateFilingStatus === "do_not_withhold",
    },
    taxExemptions: {
      futa: data.futa,
      fica: data.fica,
      suiEtt: data.suiEtt,
      sdi: data.sdi,
    },
  }
}

export function TaxWithholdingSheet({
  employee,
  onUpdate,
}: TaxWithholdingSheetProps) {
  const router = useRouter()
  const form = useForm<CompleteW4Form>({
    resolver: zodResolver(completeW4Schema),
    defaultValues: getFormDefaults(employee),
  })
  const handleSubmit = async (
    data: CompleteW4Form
  ): Promise<{ success: boolean; error?: string }> => {
    if (!employee?.id) {
      return { success: false, error: "Employee ID is required." }
    }

    // Transform flat form data to nested server action input
    const serverInput = transformToServerInput(data)

    return await updateEmployeeTax({
      employeeId: employee.id,
      ...serverInput,
    })
  }

  return (
    <EditSheetForm
      title="Tax Withholding"
      description="Update federal and state tax withholding settings."
      form={form}
      onSubmit={handleSubmit}
      successMessage="Tax withholding updated successfully!"
      contentClassName="min-w-2xl overflow-y-scroll dark-scrollbar"
      onSuccess={() => {
        router.refresh()
        onUpdate?.()
      }}
    >
      <W4FormFields control={form.control} />
    </EditSheetForm>
  )
}
