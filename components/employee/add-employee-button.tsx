"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { createEmployee } from "@/actions/employee"
import { W4FormFields } from "@/components/employee/W4FormFields"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  FormDateField,
  FormField,
  FormFieldCustom,
  FormRadioGroup,
  FormSelect,
} from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { defaults } from "@/lib/config"
import {
  EMPLOYMENT_TYPES,
  PAY_METHODS,
  PAY_TYPES,
} from "@/lib/constants/employment-constants"
import { formatSSNInput } from "@/lib/encryption/ssn"
import { logger } from "@/lib/logger"
import {
  type CompleteW4Form,
  completeW4Schema,
  type EmployeeStep1Form,
  employeeStep1Schema,
} from "@/lib/validation/employee-schema"
export function AddEmployeeButton({
  variant,
  icon = false,
}: {
  variant?: "default" | "link"
  icon?: boolean
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [step1Data, setStep1Data] = useState<EmployeeStep1Form | null>(null)

  const form = useForm<EmployeeStep1Form>({
    resolver: zodResolver(employeeStep1Schema),
    defaultValues: defaults.employee,
  })

  const w4Form = useForm<CompleteW4Form>({
    resolver: zodResolver(completeW4Schema),
    defaultValues: defaults.w4,
  })

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      // Reset both forms when dialog closes
      form.reset()
      w4Form.reset()
      setStep1Data(null)
      setCurrentStep(1)
    }
  }

  const onStep1Submit = (data: EmployeeStep1Form) => {
    logger.info("Step 1 data:", data)
    // Save step 1 data and move to step 2 (W-4 form)
    setStep1Data(data)
    setCurrentStep(2)
  }

  const onStep2Submit = async (data: CompleteW4Form) => {
    if (!step1Data) {
      logger.error("Step 1 data is missing")
      toast.error("Form data is incomplete. Please start over.")
      return
    }

    try {
      const result = await createEmployee({
        step1: step1Data,
        step2: data,
      })

      if (!result.success) {
        logger.error("Failed to create employee:", result.error)
        toast.error(result.error)
        return
      }

      // Success case
      logger.info("Employee created successfully:", result.employee)
      toast.success("Employee created successfully")

      // Reset forms before closing dialog
      form.reset()
      w4Form.reset()
      setStep1Data(null)
      setCurrentStep(1)

      setDialogOpen(false)
    } catch (error) {
      logger.error("Error submitting employee:", error)
      toast.error("An unexpected error occurred. Please try again.")
    }
  }

  const handleBackToStep1 = () => {
    setCurrentStep(1)
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          {icon && <Plus className="size-4" />}
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-200 max-h-180 overflow-y-auto no-scrollbar">
        <DialogHeader>
          <DialogTitle>Add Employee - Step {currentStep} of 2</DialogTitle>
          <DialogDescription>
            {currentStep === 1
              ? "Enter employee basic information"
              : "Enter W-4 tax withholding information"}
          </DialogDescription>
        </DialogHeader>

        {currentStep === 1 ? (
          <form
            onSubmit={form.handleSubmit(onStep1Submit)}
            className="space-y-6"
          >
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Personal Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  label="First Name"
                  id="firstName"
                  placeholder="John"
                  errorPosition="inline"
                />
                <FormField
                  control={form.control}
                  name="middleName"
                  label={
                    <>
                      Middle Name{" "}
                      <span className="text-xs text-muted-foreground">
                        Optional
                      </span>
                    </>
                  }
                  id="middleName"
                  placeholder="M."
                  errorPosition="inline"
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  label="Last Name"
                  id="lastName"
                  placeholder="Doe"
                  errorPosition="inline"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormFieldCustom
                  control={form.control}
                  name="ssn"
                  label="SSN"
                  id="ssn"
                  errorPosition="inline"
                  renderInput={(field) => (
                    <Input
                      id="ssn"
                      type="text"
                      placeholder="***-**-****"
                      maxLength={11}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const formatted = formatSSNInput(e.target.value)
                        field.onChange(formatted)
                      }}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                <FormDateField
                  control={form.control}
                  name="dateOfBirth"
                  label="Date of Birth"
                  id="dateOfBirth"
                  errorPosition="inline"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  label="Email"
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  errorPosition="inline"
                />
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  label={
                    <>
                      Phone Number{" "}
                      <span className="text-xs text-muted-foreground">
                        Optional
                      </span>
                    </>
                  }
                  id="phoneNumber"
                  placeholder="1234567890"
                  maxLength={10}
                  errorPosition="inline"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="street1"
                  label="Street Address"
                  id="street1"
                  placeholder="123 Main St"
                  errorPosition="inline"
                />
                <FormField
                  control={form.control}
                  name="street2"
                  label={
                    <>
                      Apt, Suite, etc.{" "}
                      <span className="text-xs text-muted-foreground">
                        Optional
                      </span>
                    </>
                  }
                  id="street2"
                  placeholder="Apt 4B"
                  errorPosition="inline"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  label="City"
                  id="city"
                  placeholder="San Francisco"
                  errorPosition="inline"
                />
                <FormField
                  control={form.control}
                  name="state"
                  label="State"
                  id="state"
                  placeholder="CA"
                  disabled
                  errorPosition="inline"
                />
                <FormField
                  control={form.control}
                  name="zipCode"
                  label="ZIP Code"
                  id="zipCode"
                  placeholder="94107"
                  maxLength={5}
                  errorPosition="inline"
                />
              </div>
            </div>

            {/* Employment Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Employment Information</h3>
              <div className="grid grid-cols-3 gap-4">
                <FormDateField
                  control={form.control}
                  name="hireDate"
                  label="Hire Date"
                  id="hireDate"
                  errorPosition="inline"
                />
                <FormField
                  control={form.control}
                  name="workingHours"
                  label={
                    <>
                      Working Hours/Week{" "}
                      <span className="text-xs text-muted-foreground">
                        Optional
                      </span>
                    </>
                  }
                  id="workingHours"
                  type="text"
                  inputMode="decimal"
                  placeholder="40"
                  errorPosition="inline"
                />
                <FormRadioGroup
                  control={form.control}
                  name="employmentType"
                  label="Employment Type"
                  options={EMPLOYMENT_TYPES}
                  disabled
                  labelClassName="text-sm font-medium"
                  errorPosition="inline"
                />
              </div>
            </div>

            {/* Compensation */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Compensation</h3>
              <div className="grid grid-cols-3 gap-4">
                <FormSelect
                  control={form.control}
                  name="payType"
                  label="Pay Type"
                  id="payType"
                  options={PAY_TYPES}
                  placeholder="Select type"
                  errorPosition="inline"
                />
                <FormField
                  control={form.control}
                  name="currentSalary"
                  label="Rate / Wages"
                  id="currentSalary"
                  type="text"
                  inputMode="decimal"
                  placeholder="60"
                  errorPosition="inline"
                />
                <FormSelect
                  control={form.control}
                  name="payMethod"
                  label="Pay Method"
                  id="payMethod"
                  options={PAY_METHODS}
                  placeholder="Select method"
                  errorPosition="inline"
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">Next: W-4 Information</Button>
            </DialogFooter>
          </form>
        ) : (
          <form
            onSubmit={w4Form.handleSubmit(onStep2Submit)}
            className="space-y-6"
          >
            {/* Step 2: W-4 Form Fields */}
            <W4FormFields control={w4Form.control} />

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={handleBackToStep1}
              >
                Back
              </Button>
              <Button type="submit">Save Employee</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
