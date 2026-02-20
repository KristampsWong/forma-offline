"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"

import { updateEmployeePersonal } from "@/actions/employee"
import { EditSheetForm } from "@/components/ui/edit-sheet-form"
import { FormDateField, FormField } from "@/components/ui/form-field"
import { defaults } from "@/lib/config"
import { extractDateOnly } from "@/lib/date/utils"
import { type UpdatePersonalForm, updatePersonalSchema } from "@/lib/validation"
import type { EmployeeDetail } from "@/types/employee"

interface PersonalDetailsSheetProps {
  employee: EmployeeDetail
  onUpdate?: () => void
}

/**
 * Creates default values for the personal details form from employee data
 * Falls back to config defaults for missing values
 */
function getFormDefaults(employee: EmployeeDetail): UpdatePersonalForm {
  return {
    ...defaults.employeePersonal,
    firstName: employee.firstName || defaults.employeePersonal.firstName,
    lastName: employee.lastName || defaults.employeePersonal.lastName,
    middleName: employee.middleName || defaults.employeePersonal.middleName,
    email: employee.email || defaults.employeePersonal.email,
    phoneNumber: employee.phoneNumber || defaults.employeePersonal.phoneNumber,
    // Use extractDateOnly to get MM/DD/YYYY string format (timezone-safe)
    dateOfBirth:
      extractDateOnly(employee.dateOfBirth) ||
      defaults.employeePersonal.dateOfBirth,
    street1: employee.address?.street1 || defaults.employeePersonal.street1,
    street2: employee.address?.street2 || defaults.employeePersonal.street2,
    city: employee.address?.city || defaults.employeePersonal.city,
    state: defaults.employeePersonal.state, // Only CA supported for tax purposes
    zipCode: employee.address?.zipCode || defaults.employeePersonal.zipCode,
  }
}

export function PersonalDetailsSheet({
  employee,
  onUpdate,
}: PersonalDetailsSheetProps) {
  const router = useRouter()

  const form = useForm<UpdatePersonalForm>({
    resolver: zodResolver(updatePersonalSchema),
    defaultValues: getFormDefaults(employee),
  })

  const handleSubmit = async (
    data: UpdatePersonalForm
  ): Promise<{ success: boolean; error?: string }> => {
    if (!employee?.id) {
      return {
        success: false,
        error: "Employee ID is required to update.",
      }
    }

    // Call the server action to update employee personal details
    const result = await updateEmployeePersonal({
      employeeId: employee.id,
      data: {
        ...data,
        phoneNumber: data.phoneNumber?.trim() || undefined,
      },
    })

    return result
  }

  return (
    <EditSheetForm
      title="Personal Details"
      description="Make changes to employee details here. Click save when you're done."
      form={form}
      onSubmit={handleSubmit}
      successMessage="Employee personal information updated successfully!"
      contentClassName="min-w-lg overflow-y-scroll dark-scrollbar"
      onSuccess={() => {
        router.refresh()
        onUpdate?.()
      }}
    >
      {/* Personal Information */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm">Personal Information</h4>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            label="First name"
            id="edit-firstName"
            placeholder="John"
          />
          <FormField
            control={form.control}
            name="lastName"
            label="Last name"
            id="edit-lastName"
            placeholder="Doe"
          />
        </div>

        <FormField
          control={form.control}
          name="middleName"
          label="Middle name (optional)"
          id="edit-middleName"
          placeholder="M"
        />

        <FormField
          control={form.control}
          name="email"
          label="Email"
          id="edit-email"
          type="email"
          placeholder="john.doe@example.com"
        />

        <FormField
          control={form.control}
          name="phoneNumber"
          label="Phone (optional)"
          id="edit-phoneNumber"
          placeholder="1234567890"
          maxLength={10}
          inputMode="tel"
        />

        <FormDateField
          control={form.control}
          name="dateOfBirth"
          label="Date of birth"
          id="edit-dateOfBirth"
        />
      </div>

      {/* Address Information */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm">Address</h4>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="street1"
            label="Street address"
            id="edit-street1"
            placeholder="123 Main St"
          />

          <FormField
            control={form.control}
            name="street2"
            label="Apt, Suite, etc. (optional)"
            id="edit-street2"
            placeholder="Apt 4B"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="city"
            label="City"
            id="edit-city"
            placeholder="San Francisco"
          />

          <FormField
            control={form.control}
            name="state"
            label="State"
            id="edit-state"
            disabled
            placeholder="CA"
          />

          <FormField
            control={form.control}
            name="zipCode"
            label="ZIP Code"
            id="edit-zipCode"
            placeholder="94107"
            maxLength={5}
          />
        </div>
      </div>
    </EditSheetForm>
  )
}
