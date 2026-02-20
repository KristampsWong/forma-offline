/**
 * W4FormFields Component
 * Grouped W-4 tax withholding fields for reuse across add-employee and tax-withholding forms
 *
 * Similar to AddressFormFields, this component encapsulates all W-4 related fields
 * to eliminate code duplication and ensure consistency.
 */

"use client"

import Link from "next/link"
import type { Control } from "react-hook-form"

import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  FormField,
  FormFieldCustom,
  FormRadioGroup,
  FormSelect,
} from "@/components/ui/form-field"
import {
  FEDERAL_FILING_STATUSES,
  STATE_FILING_STATUSES,
  WAGE_PLAN_OPTIONS,
} from "@/lib/constants/tax-constants"
import type { CompleteW4Form } from "@/lib/validation/employee-schema"

interface W4FormFieldsProps {
  control: Control<CompleteW4Form>
  disabled?: boolean
}

/**
 * Complete W-4 Form Fields
 * Includes federal withholding, state withholding, wage plan, and tax exemptions
 */
export function W4FormFields({ control, disabled }: W4FormFieldsProps) {
  return (
    <>
      <FormVersionField control={control} />
      <FederalWithholdingFields control={control} disabled={disabled} />
      <StateWithholdingFields control={control} disabled={disabled} />
      <WagePlanFields control={control} disabled={disabled} />
      <TaxExemptionFields control={control} disabled={disabled} />
    </>
  )
}

/**
 * Form Version Field (W-4 2020 or later - fixed)
 */
function FormVersionField({ control }: { control: Control<CompleteW4Form> }) {
  const W4_VERSION_OPTIONS = [
    { value: "w4_2020_or_later", label: "2020 or later (Form W-4)" },
  ] as const

  return (
    <div className="space-y-4">
      <h3 className="font-medium">W-4 Form Version</h3>
      <FormRadioGroup
        control={control}
        name="formVersion"
        options={W4_VERSION_OPTIONS}
        disabled
      />
    </div>
  )
}

/**
 * Federal Withholding Fields
 * Filing status, multiple jobs, dependents deduction, and other adjustments
 */
function FederalWithholdingFields({
  control,
  disabled,
}: {
  control: Control<CompleteW4Form>
  disabled?: boolean
}) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium">Federal Withholding</h4>
        <p className="text-sm text-muted-foreground">
          You can find the information for this section on the employee&apos;s
          Form W-4.
        </p>
      </div>

      <FormSelect
        control={control}
        name="federalFilingStatus"
        label="Filing status (Step 1c)"
        id="federalFilingStatus"
        options={FEDERAL_FILING_STATUSES}
        disabled={disabled}
      />

      <FormFieldCustom
        control={control}
        name="multipleJobsOrSpouseWorks"
        label=""
        id="multipleJobsOrSpouseWorks"
        renderInput={(field) => (
          <Field orientation="horizontal" className="space-x-3">
            <Checkbox
              id="multipleJobsOrSpouseWorks"
              checked={!!field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              disabled={disabled}
            />
            <FieldLabel
              htmlFor="multipleJobsOrSpouseWorks"
              className="font-normal cursor-pointer"
            >
              Select if box 2c is checked (Step 2c)
            </FieldLabel>
          </Field>
        )}
      />

      <FormField
        control={control}
        name="claimedDependentsDeduction"
        label="Claimed dependents' deduction (Step 3)"
        id="claimedDependentsDeduction"
        type="text"
        inputMode="decimal"
        placeholder="0"
        disabled={disabled}
      />

      {/* Other Adjustments */}
      <div className="space-y-4">
        <h4 className="font-medium">Other adjustments</h4>
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={control}
            name="otherIncome"
            label="Other income (Step 4a)"
            id="otherIncome"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            disabled={disabled}
          />
          <FormField
            control={control}
            name="deductions"
            label="Deductions (Step 4b)"
            id="deductions"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            disabled={disabled}
          />
          <FormField
            control={control}
            name="extraWithholding"
            label="Extra withholding (Step 4c)"
            id="extraWithholding"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * State Withholding Fields (California DE-4)
 * Filing status, allowances, and additional withholding
 */
function StateWithholdingFields({
  control,
  disabled,
}: {
  control: Control<CompleteW4Form>
  disabled?: boolean
}) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium">State Withholding</h4>
        <p className="text-sm text-muted-foreground">
          You can find the information for this section on the employee&apos;s
          state tax form.
        </p>
      </div>

      <FormSelect
        control={control}
        name="stateFilingStatus"
        label="Filing status"
        id="stateFilingStatus"
        options={STATE_FILING_STATUSES}
        disabled={disabled}
      />

      <FormField
        control={control}
        name="regularAllowances"
        label="Number of regular allowances (Worksheet A)"
        id="regularAllowances"
        type="text"
        inputMode="numeric"
        inputFilter={(value) => value.replace(/\D/g, "")}
        placeholder="0"
        disabled={disabled}
        errorPosition="inline"
      />

      <FormField
        control={control}
        name="estimatedAllowances"
        label="Number of allowances from estimated deductions (Worksheet B)"
        id="estimatedAllowances"
        type="text"
        inputMode="numeric"
        inputFilter={(value) => value.replace(/\D/g, "")}
        placeholder="0"
        disabled={disabled}
        errorPosition="inline"
      />

      <FormField
        control={control}
        name="stateAdditionalWithholding"
        label="Additional amount to withhold"
        id="stateAdditionalWithholding"
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        disabled={disabled}
        errorPosition="inline"
      />
    </div>
  )
}

/**
 * California Wage Plan Code Field
 */
function WagePlanFields({
  control,
  disabled,
}: {
  control: Control<CompleteW4Form>
  disabled?: boolean
}) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium">California wages plan code</h4>
        <p className="text-sm text-muted-foreground">
          Select a wage plan code for proper benefit reporting, ensuring
          reported wages accurately determine employee benefit eligibility.
          <Link
            href="https://edd.ca.gov/siteassets/files/pdf_pub_ctr/de231wpc.pdf"
            target="_blank"
            className="underline ml-1"
          >
            Learn more
          </Link>
        </p>
      </div>
      <FormSelect
        control={control}
        name="californiaWagesPlanCode"
        label="Wages plan code"
        id="californiaWagesPlanCode"
        options={WAGE_PLAN_OPTIONS}
        disabled={disabled}
      />
    </div>
  )
}

/**
 * Tax Exemption Checkboxes
 * FUTA, FICA, CA SUI/ETT, CA SDI
 */
type TaxExemptionName = "futa" | "fica" | "suiEtt" | "sdi"

function TaxExemptionFields({
  control,
  disabled,
}: {
  control: Control<CompleteW4Form>
  disabled?: boolean
}) {
  const exemptions: Array<{ name: TaxExemptionName; label: string }> = [
    { name: "futa", label: "FUTA" },
    { name: "fica", label: "Social Security and Medicare" },
    { name: "suiEtt", label: "CA SUI and ETT" },
    { name: "sdi", label: "CA SDI" },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium">Tax exemptions</h4>
        <p className="text-sm text-muted-foreground">
          These are uncommon. Confirm eligibility criteria with a tax
          professional before applying exemptions.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {exemptions.map(({ name, label }) => (
          <FormFieldCustom
            key={name}
            control={control}
            name={name}
            label=""
            id={`tax-exemption-${name}`}
            renderInput={(field) => (
              <Field orientation="horizontal" className="space-x-3">
                <Checkbox
                  id={`tax-exemption-${name}`}
                  checked={!!field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                  disabled={disabled}
                />
                <FieldLabel
                  htmlFor={`tax-exemption-${name}`}
                  className="font-normal cursor-pointer"
                >
                  {label}
                </FieldLabel>
              </Field>
            )}
          />
        ))}
      </div>
    </div>
  )
}
