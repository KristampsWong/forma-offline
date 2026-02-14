"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlert } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { useForm } from "react-hook-form"

import { createCompany } from "@/actions/company"
import ErrorMessage from "@/components/error-message"
import { Button } from "@/components/ui/button"
import { CardContent, CardFooter } from "@/components/ui/card"
import { FieldGroup, FieldSet } from "@/components/ui/field"
import {
  FormField,
  FormFieldCustom,
  FormRadioGroup,
} from "@/components/ui/form-field"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Input } from "@/components/ui/input"
import { EINInput } from "@/components/ui/input-ein"
import { defaults } from "@/lib/config"
import { PAY_FREQUENCIES } from "@/lib/constants/employment-constants"
import {
  type CompanyFormValues,
  companySchema,
} from "@/lib/validation/company-schema"

export function CompanyOnboardingForm() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const {
    handleSubmit,
    control,
    formState: { errors },
    clearErrors,
    setError,
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: defaults.company,
  })

  const onSubmit = (values: CompanyFormValues) => {
    clearErrors("root")

    startTransition(async () => {
      try {
        const result = await createCompany({
          name: values.name,
          ein: values.ein,
          address: {
            line1: values.address,
            line2: values.line2 || "",
            city: values.city,
            state: values.state,
            zip: values.zip,
          },
          payFrequency: values.payFrequency,
        })

        if (!result.success) {
          setError("root", {
            message: result.error || "Failed to create company",
          })
          return
        }

        router.push("/overview")
      } catch (error) {
        setError("root", {
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred. Please try again.",
        })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full">
      <CardContent className="space-y-8 px-0">
        <FieldSet>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={control}
                name="name"
                label="What's your business name?"
                id="name"
                placeholder="Business name"
                disabled={isPending}
                labelClassName="text-base"
              />

              <FormFieldCustom
                control={control}
                name="ein"
                label="What's your company EIN number?"
                id="ein"
                labelClassName="text-base"
                renderInput={(field) => (
                  <EINInput
                    id="ein"
                    disabled={isPending}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </div>
          </FieldGroup>
        </FieldSet>

        <FieldSet className="gap-0">
          <p className="font-medium">What&apos;s your business address?</p>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={control}
                name="address"
                label=""
                id="address"
                placeholder="Address"
                disabled={isPending}
              />

              <FormField
                control={control}
                name="line2"
                label=""
                id="line2"
                placeholder="Apt/Ste (optional)"
                disabled={isPending}
              />

              <FormField
                control={control}
                name="city"
                label=""
                id="city"
                placeholder="City"
                disabled={isPending}
              />

              <FormFieldCustom
                control={control}
                name="state"
                label=""
                id="state"
                renderInput={(field) => (
                  <div className="relative">
                    <Input
                      id="state"
                      disabled={isPending}
                      readOnly
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                    <div className="absolute top-2 right-3">
                      <HoverCard>
                        <HoverCardTrigger>
                          <CircleAlert className="size-5 text-muted-foreground/50" />
                        </HoverCardTrigger>
                        <HoverCardContent className="text-sm whitespace-nowrap p-2">
                          Currently&nbsp;supporting&nbsp;California only.
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                  </div>
                )}
              />

              <FormField
                control={control}
                name="zip"
                label=""
                id="zip"
                placeholder="Zipcode"
                maxLength={5}
                disabled={isPending}
              />
            </div>
          </FieldGroup>
        </FieldSet>

        <FieldSet data-invalid={!!errors.payFrequency}>
          <FormRadioGroup
            control={control}
            name="payFrequency"
            label="Payroll Schedule"
            options={PAY_FREQUENCIES}
            disabled={isPending}
            orientation="horizontal"
          />
        </FieldSet>

        {errors.root && <ErrorMessage text={errors.root.message as string} />}
      </CardContent>

      <CardFooter className="flex justify-end px-0">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Go to Dashboard"}
        </Button>
      </CardFooter>
    </form>
  )
}
