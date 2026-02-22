"use client"

import {
  Controller,
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"
import type { ReactNode } from "react"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"
import InputWithCalendar from "@/components/ui/input-with-calander"
import { cn } from "@/lib/utils"
export interface SelectOption {
  value: string
  label: string
}

interface FormFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: ReactNode
  id: string
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  type?: "text" | "email" | "password" | "number"
  inputMode?: "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url"
  inputFilter?: (value: string) => string // Filter/transform input value
  className?: string
  labelClassName?: string
  errorPosition?: "below" | "inline" // Show error below input or inline with label
}

export function FormField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  id,
  placeholder,
  disabled,
  maxLength,
  type = "text",
  inputMode,
  inputFilter,
  className,
  labelClassName,
  errorPosition = "below",
}: FormFieldProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id} className={labelClassName}>
            {label}
            {errorPosition === "inline" && fieldState.invalid && (
              <FieldError className="text-xs" errors={[fieldState.error]} />
            )}
          </FieldLabel>
          <Input
            id={id}
            type={type}
            inputMode={inputMode}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            className={className}
            aria-invalid={fieldState.invalid}
            value={field.value ?? ""}
            onChange={(e) => {
              const value = inputFilter ? inputFilter(e.target.value) : e.target.value
              field.onChange(value)
            }}
            onBlur={field.onBlur}
          />
          {errorPosition === "below" && fieldState.invalid && (
            <FieldError errors={[fieldState.error]} />
          )}
        </Field>
      )}
    />
  )
}

interface FormSelectProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: ReactNode
  id: string
  options: readonly SelectOption[]
  placeholder?: string
  disabled?: boolean
  labelClassName?: string
  errorPosition?: "below" | "inline" // Show error below input or inline with label
}

export function FormSelect<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  id,
  options,
  placeholder,
  disabled,
  labelClassName,
  errorPosition = "below",
}: FormSelectProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id} className={labelClassName}>
            {label}
            {errorPosition === "inline" && fieldState.invalid && (
              <FieldError className="text-xs" errors={[fieldState.error]} />
            )}
          </FieldLabel>
          <Select
            onValueChange={field.onChange}
            defaultValue={field.value}
            disabled={disabled}
          >
            <SelectTrigger id={id} className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errorPosition === "below" && fieldState.invalid && (
            <FieldError errors={[fieldState.error]} />
          )}
        </Field>
      )}
    />
  )
}

interface FormComboboxProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: ReactNode
  id: string
  options: readonly SelectOption[]
  placeholder?: string
  disabled?: boolean
  labelClassName?: string
  errorPosition?: "below" | "inline"
}

export function FormCombobox<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  id,
  options,
  placeholder = "Select...",
  disabled,
  labelClassName,
  errorPosition = "below",
}: FormComboboxProps<TFieldValues>) {
  const items = options as SelectOption[]

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const selectedItem =
          items.find((o) => o.value === field.value) ?? null

        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id} className={labelClassName}>
              {label}
              {errorPosition === "inline" && fieldState.invalid && (
                <FieldError className="text-xs" errors={[fieldState.error]} />
              )}
            </FieldLabel>
            <Combobox
              items={items}
              value={selectedItem}
              onValueChange={(item) =>
                field.onChange((item as SelectOption | null)?.value ?? "")
              }
            >
              <ComboboxTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between font-normal"
                    disabled={disabled}
                    id={id}
                  >
                    <ComboboxValue placeholder={placeholder} />
                  </Button>
                }
              />
              <ComboboxContent>
                <ComboboxInput showTrigger={false} placeholder="Search..." />
                <ComboboxEmpty>No results found</ComboboxEmpty>
                <ComboboxList>
                  {(item: SelectOption) => (
                    <ComboboxItem key={item.value} value={item}>
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            {errorPosition === "below" && fieldState.invalid && (
              <FieldError errors={[fieldState.error]} />
            )}
          </Field>
        )
      }}
    />
  )
}

interface FormDateFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: ReactNode
  id: string
  disabled?: boolean
  labelClassName?: string
  errorPosition?: "below" | "inline" // Show error below input or inline with label
}

export function FormDateField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  id,
  disabled,
  labelClassName,
  errorPosition = "below",
}: FormDateFieldProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id} className={labelClassName}>
            {label}
            {errorPosition === "inline" && fieldState.invalid && (
              <FieldError className="text-xs" errors={[fieldState.error]} />
            )}
          </FieldLabel>
          <InputWithCalendar
            field={field}
            disabled={disabled}
            aria-invalid={fieldState.invalid}
            id={id}
          />
          {errorPosition === "below" && fieldState.invalid && (
            <FieldError errors={[fieldState.error]} />
          )}
        </Field>
      )}
    />
  )
}

interface FormRadioGroupProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label?: ReactNode
  options: readonly SelectOption[]
  disabled?: boolean
  className?: string
  labelClassName?: string
  orientation?: "horizontal" | "vertical"
  errorPosition?: "below" | "inline" // Show error below input or inline with label
}

export function FormRadioGroup<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  options,
  disabled,
  className,
  labelClassName = "text-base",
  orientation = "vertical",
  errorPosition = "below",
}: FormRadioGroupProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className={cn("space-y-3", className)}>
          {label && (
            <FieldLabel className={labelClassName}>
              {label}
              {errorPosition === "inline" && fieldState.invalid && (
                <FieldError errors={[fieldState.error]} />
              )}
            </FieldLabel>
          )}
          <RadioGroup
            onValueChange={field.onChange}
            value={field.value}
            className={orientation === "horizontal" ? "flex" : ""}
          >
            {options.map((option) => (
              <Field
                key={option.value}
                orientation="horizontal"
                className={orientation === "horizontal" ? "w-20" : ""}
              >
                <RadioGroupItem
                  id={`${String(name)}-${option.value}`}
                  value={option.value}
                  disabled={disabled}
                />
                <FieldLabel
                  htmlFor={`${String(name)}-${option.value}`}
                  className="cursor-pointer font-normal leading-none"
                >
                  {option.label}
                </FieldLabel>
              </Field>
            ))}
          </RadioGroup>
          {errorPosition === "below" && fieldState.invalid && (
            <FieldError errors={[fieldState.error]} />
          )}
        </div>
      )}
    />
  )
}

interface FormFieldCustomProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: ReactNode
  id: string
  labelClassName?: string
  errorPosition?: "below" | "inline" // Show error below input or inline with label
  renderInput: (
    field: ControllerRenderProps<TFieldValues, FieldPath<TFieldValues>>
  ) => ReactNode
}

export function FormFieldCustom<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  id,
  labelClassName,
  errorPosition = "below",
  renderInput,
}: FormFieldCustomProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id} className={labelClassName}>
            {label}
            {errorPosition === "inline" && fieldState.invalid && (
              <FieldError className="text-xs" errors={[fieldState.error]} />
            )}
          </FieldLabel>
          {renderInput(field)}
          {errorPosition === "below" && fieldState.invalid && (
            <FieldError errors={[fieldState.error]} />
          )}
        </Field>
      )}
    />
  )
}
