"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"

import { updateEmployeeCompensation } from "@/actions/employee"
import { EditSheetForm } from "@/components/ui/edit-sheet-form"
import { FormField, FormSelect } from "@/components/ui/form-field"
import type { PayMethod, PayType } from "@/lib/constants/employment-constants"
import { PAY_METHODS, PAY_TYPES } from "@/lib/constants/employment-constants"
import { type UpdateBasePayForm, updateBasePaySchema } from "@/lib/validation"
import type { EmployeeDetail } from "@/types/employee"

interface BasePaySheetProps {
  employee: EmployeeDetail
  onUpdate?: () => void
}

function getFormDefaults(employee: EmployeeDetail): UpdateBasePayForm {
  return {
    salary: String(employee.currentCompensation?.salary || 0),
    payType:
      (employee.currentCompensation?.payType as PayType) || "hourly",
    workingHours: String(employee.currentCompensation?.workingHours || 0),
    payMethod:
      (employee.currentPayMethod?.payMethod as PayMethod) || "check",
  }
}

export function BasePaySheet({ employee, onUpdate }: BasePaySheetProps) {
  const router = useRouter()
  const form = useForm<UpdateBasePayForm>({
    resolver: zodResolver(updateBasePaySchema),
    defaultValues: getFormDefaults(employee),
  })

  const handleSubmit = async (
    data: UpdateBasePayForm
  ): Promise<{ success: boolean; error?: string }> => {
    if (!employee?.id) {
      return { success: false, error: "Employee ID is required." }
    }
    return await updateEmployeeCompensation({ employeeId: employee.id, data })
  }

  const payType = useWatch({ control: form.control, name: "payType" })

  return (
    <EditSheetForm
      title="Base Pay"
      description="Update compensation and pay method. Click save when you're done."
      form={form}
      onSubmit={handleSubmit}
      successMessage="Base pay updated successfully!"
      contentClassName="min-w-lg overflow-y-scroll dark-scrollbar"
      onSuccess={() => {
        router.refresh()
        onUpdate?.()
      }}
    >
      <div className="space-y-4">
        <FormSelect
          control={form.control}
          name="payType"
          label="Pay type"
          id="edit-payType"
          options={PAY_TYPES}
          placeholder="Select pay type"
        />

        <FormField
          control={form.control}
          name="salary"
          label={payType === "hourly" ? "Hourly rate ($)" : "Annual salary ($)"}
          id="edit-salary"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
        />

        <FormField
          control={form.control}
          name="workingHours"
          label="Working hours per pay period"
          id="edit-workingHours"
          type="text"
          inputMode="decimal"
          placeholder="0"
        />

        <FormSelect
          control={form.control}
          name="payMethod"
          label="Pay method"
          id="edit-payMethod"
          options={PAY_METHODS}
          placeholder="Select pay method"
        />
      </div>
    </EditSheetForm>
  )
}
