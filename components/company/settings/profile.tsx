"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { updateCompany } from "@/actions/company"
import { SettingsDialogLayout } from "@/components/company/settings/settings-dialog-layout"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { FormAlert } from "@/components/ui/form-alert"
import { FormField, FormSelect } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { PAY_FREQUENCIES } from "@/lib/constants/employment-constants"
import { formatEIN } from "@/lib/format/ein"
import {
  type UpdateCompanyFormValues,
  updateCompanySchema,
} from "@/lib/validation/company-schema"
import { type CompanyData } from "@/types/company"

export function CompanyForm({
  companyData,
  onCloseAction,
} : {
  companyData : CompanyData | null
  onCloseAction : () => void
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const form = useForm<UpdateCompanyFormValues>({
    resolver: zodResolver(updateCompanySchema),
    defaultValues: {
      name: companyData?.name || "",
      address: companyData?.address?.line1 || "",
      line2: companyData?.address?.line2 || "",
      city: companyData?.address?.city || "",
      state: companyData?.address?.state || "",
      zip: companyData?.address?.zip || "",
      payFrequency: companyData?.payFrequency || "monthly",
    },
  })

  const onSubmit = (values : UpdateCompanyFormValues) => {
    form.clearErrors("root")

    const sanitizedValues = {
      name: values.name.trim(),
      address: values.address.trim(),
      line2: values.line2?.trim() || undefined,
      city: values.city.trim(),
      state: values.state.trim(),
      zip: values.zip.trim(),
      payFrequency: values.payFrequency,
    }

    startTransition(async () => {
      const result = await updateCompany(sanitizedValues)

      if (!result.success) {
        form.setError("root", { message: result.error })
        toast.error(result.error || "Failed to update company settings")
        return
      }

      toast.success("Company settings updated successfully")
      router.refresh()
      onCloseAction()
    })
  }

  return (
    <SettingsDialogLayout
      title="Company Profile"
      description="Update your company's profile information and settings."
      onSubmit={form.handleSubmit(onSubmit)}
      isPending={isPending}
      submitText="Save changes"
      onCancel={onCloseAction}
      error={form.formState.errors.root?.message}
    >
      <FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            label="Company name"
            id="company-name"
            placeholder="eg: Acme"
            disabled={isPending}
          />

          <Field>
            <FieldLabel htmlFor="company-ein">Company EIN</FieldLabel>
            <Input
              id="company-ein"
              value={companyData?.ein ? formatEIN(companyData.ein) : ""}
              disabled
              className="bg-muted"
            />
          </Field>

          <FormField
            control={form.control}
            name="address"
            label="Company Address"
            id="company-address"
            placeholder="eg: 123 Main St"
            disabled={isPending}
          />

          <FormField
            control={form.control}
            name="line2"
            label="Address optional"
            id="address-line2"
            placeholder="eg: Suite 100, Apt 4B"
            disabled={isPending}
          />

          <FormField
            control={form.control}
            name="city"
            label="City"
            id="city"
            placeholder="eg: San Francisco"
            disabled={isPending}
          />

          <FormField
            control={form.control}
            name="state"
            label="State"
            id="state"
            placeholder="eg: CA"
            disabled={isPending}
          />

          <FormField
            control={form.control}
            name="zip"
            label="Zip Code"
            id="zip"
            placeholder="eg: 94107"
            maxLength={5}
            disabled={isPending}
          />

          <FormSelect
            control={form.control}
            name="payFrequency"
            label="Payroll Schedule"
            id="pay-frequency"
            options={PAY_FREQUENCIES}
            placeholder="Select payroll schedule"
            disabled={isPending}
          />
        </div>
      </FieldGroup>

      <FormAlert title="Note: Changing payroll schedule">
        Changing the payroll schedule will affect all employees and future
        payroll calculations.
      </FormAlert>
    </SettingsDialogLayout>
  )
}
