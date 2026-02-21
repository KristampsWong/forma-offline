"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { updateCompanyStateRate } from "@/actions/company"
import { SettingsDialogLayout } from "@/components/company/settings/settings-dialog-layout"
import { FieldGroup } from "@/components/ui/field"
import { FormAlert } from "@/components/ui/form-alert"
import { FormDateField, FormField } from "@/components/ui/form-field"
import { extractDateOnly } from "@/lib/date/utils"
import { logger } from "@/lib/logger"
import {
  type StateRateFormValues,
  stateRateSchema,
} from "@/lib/validation/company-schema"

export function StateRateSection({
  currentUIRate,
  currentETTRate,
  currentEDDAccountNumber,
  currentEffectiveDate,
} : {
  currentUIRate ?: number
  currentETTRate ?: number
  currentEDDAccountNumber ?: string
  currentEffectiveDate ?: Date | string
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const form = useForm<StateRateFormValues>({
    resolver: zodResolver(stateRateSchema),
    defaultValues: {
      uiRate:
        currentUIRate !== undefined ? (currentUIRate * 100).toFixed(1) : "3.4",
      ettRate:
        currentETTRate !== undefined
          ? (currentETTRate * 100).toFixed(1)
          : "0.1",
      eddAccountNumber: currentEDDAccountNumber || "",
      effectiveDate: currentEffectiveDate
        ? (extractDateOnly(currentEffectiveDate) ?? "")
        : (extractDateOnly(new Date()) ?? ""),
    },
  })

  const onSubmit = (values : StateRateFormValues) => {
    startTransition(async () => {
      try {
        const result = await updateCompanyStateRate({
          uiRate: values.uiRate,
          ettRate: values.ettRate,
          eddAccountNumber: values.eddAccountNumber,
          effectiveDate: values.effectiveDate,
        })

        if (result.success) {
          toast.success("State tax rates updated successfully")
          router.refresh()
        } else {
          toast.error(result.error || "Failed to update state tax rates")
        }
      } catch (error) {
        logger.error("Error updating state rates:", error)
        toast.error("An error occurred while updating state tax rates")
      }
    })
  }

  return (
    <SettingsDialogLayout
      title="California State Tax Rates"
      description={
        <>
          We use this information accurately pay and file your state payroll
          taxes.&nbsp;
          <Link href="#" className="underline font-medium">
            Learn more
          </Link>
        </>
      }
      onSubmit={form.handleSubmit(onSubmit)}
      isPending={isPending}
    >
      <FieldGroup className="gap-4">
        <FormField
          control={form.control}
          name="eddAccountNumber"
          label="EDD Employer Payroll Tax Account Number"
          id="edd-account-number"
          placeholder="12345678"
          maxLength={8}
          disabled={isPending}
        />

        <FormField
          control={form.control}
          name="uiRate"
          label={
            <>
              Unemployment Insurance (UI) rate{" "}
              <Link
                href="#"
                className="underline font-medium text-muted-foreground text-xs"
              >
                Learn more
              </Link>
            </>
          }
          id="ui-rate"
          disabled={isPending}
        />

        <FormField
          control={form.control}
          name="ettRate"
          label={
            <>
              Employment Training Tax (ETT) rate{" "}
              <Link
                href="#"
                className="underline font-medium text-muted-foreground text-xs"
              >
                Learn more
              </Link>
            </>
          }
          id="ett-rate"
          disabled={isPending}
        />

        <FormDateField
          control={form.control}
          name="effectiveDate"
          label={
            <>
              Effective Date{" "}
              <span className="text-sm text-muted-foreground">
                The date when these tax rates become effective.
              </span>
            </>
          }
          id="effective-date"
          disabled={isPending}
        />
      </FieldGroup>

      {!currentEDDAccountNumber && (
        <FormAlert>
          Before running your first payroll, please enter your EDD account
          information.
        </FormAlert>
      )}
    </SettingsDialogLayout>
  )
}
