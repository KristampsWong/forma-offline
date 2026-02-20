"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"

import { updateEmployeeEmployment } from "@/actions/employee"
import { EditSheetForm } from "@/components/ui/edit-sheet-form"
import { Field, FieldLabel } from "@/components/ui/field"
import { FormDateField, FormField, FormSelect } from "@/components/ui/form-field"
import { EMPLOYMENT_STATUSES } from "@/lib/constants/employment-constants"
import { extractDateOnly } from "@/lib/date/utils"
import { type UpdateEmploymentForm, updateEmploymentSchema } from "@/lib/validation"
import type { EmployeeDetail } from "@/types/employee"

interface EmploymentDetailsSheetProps {
  employee: EmployeeDetail
  onUpdate?: () => void
}

function getFormDefaults(employee: EmployeeDetail): UpdateEmploymentForm {
  return {
    hireDate: extractDateOnly(employee.hireDate) || "",
    employmentStatus: employee.employmentStatus || "active",
    terminationDate: "",
    department: employee.department || "",
    position: employee.position || "",
  }
}

export function EmploymentDetailsSheet({
  employee,
  onUpdate,
}: EmploymentDetailsSheetProps) {
  const router = useRouter()
  const form = useForm<UpdateEmploymentForm>({
    resolver: zodResolver(updateEmploymentSchema),
    defaultValues: getFormDefaults(employee),
  })

  const employmentStatus = useWatch({
    control: form.control,
    name: "employmentStatus",
  })

  const handleSubmit = async (
    data: UpdateEmploymentForm
  ): Promise<{ success: boolean; error?: string }> => {
    if (!employee?.id) {
      return { success: false, error: "Employee ID is required to update." }
    }

    const result = await updateEmployeeEmployment({
      employeeId: employee.id,
      data: {
        ...data,
        department: data.department?.trim() || undefined,
        position: data.position?.trim() || undefined,
        terminationDate:
          data.employmentStatus === "terminated"
            ? data.terminationDate
            : undefined,
      },
    })

    return result
  }

  return (
    <EditSheetForm
      title="Employment Details"
      description="Update employment information. Click save when you're done."
      form={form}
      onSubmit={handleSubmit}
      successMessage="Employment details updated successfully!"
      contentClassName="min-w-lg overflow-y-scroll dark-scrollbar"
      onSuccess={() => {
        router.refresh()
        onUpdate?.()
      }}
    >
      <div className="space-y-4">
        <FormDateField
          control={form.control}
          name="hireDate"
          label="Hire date"
          id="edit-hireDate"
        />

        <FormSelect
          control={form.control}
          name="employmentStatus"
          label="Employment status"
          id="edit-employmentStatus"
          options={EMPLOYMENT_STATUSES}
          placeholder="Select status"
        />

        {employmentStatus === "terminated" && (
          <FormDateField
            control={form.control}
            name="terminationDate"
            label="Termination date"
            id="edit-terminationDate"
          />
        )}

        <Field>
          <FieldLabel>Employment type</FieldLabel>
          <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
            {employee.employmentType}
          </div>
        </Field>

        <FormField
          control={form.control}
          name="department"
          label="Department (optional)"
          id="edit-department"
          placeholder="Engineering"
        />

        <FormField
          control={form.control}
          name="position"
          label="Position (optional)"
          id="edit-position"
          placeholder="Software Engineer"
        />
      </div>
    </EditSheetForm>
  )
}
