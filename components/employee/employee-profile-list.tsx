// import { FormattedCurrency } from "@/components/data-display"
// import { formatPhoneNumber, formatText } from "@/lib/utils/text"
import type { ReactNode } from "react"

import { Label } from "@/components/ui/label"
import { extractDateOnly, formatDateUTC } from "@/lib/date/utils"
import { cn, formatAmount } from "@/lib/utils"
import type { EmployeeDetail } from "@/types/employee"

import { Card } from "../ui/card"
import SectionTitle from "./section-title"

export default function EmployeeProfileList({
  employee,
}: {
  employee: EmployeeDetail
}) {
  // logger.info("EmployeeProfileList employee:", employee)
  // Helper to format full name
  const fullName = `${employee.firstName}${
    employee.middleName ? ` ${employee.middleName}` : ""
  } ${employee.lastName}`

  // Helper to format address
  const fullAddress = (
    <>
      {employee.address.street1}
      {employee.address.street2 && `, ${employee.address.street2}`}
      <br />
      {employee.address.city}, {employee.address.state}{" "}
      {employee.address.zipCode}
    </>
  )

  return (
    <div className="space-y-8">
      {/* Personal Details */}
      <DataCard
        title="Personal details"
        action={<SectionTitle section="personal" employee={employee} />}
      >
        <DataGrid>
          <DataItem label="Legal name" value={fullName} />
          <DataItem label="Email" value={employee.email} />
          <DataItem label="Phone" value={employee.phoneNumber} />
          <DataItem label="Address" value={fullAddress} capitalize />
          <DataItem
            label="Date of birth"
            value={extractDateOnly(employee.dateOfBirth)}
          />
          <DataItem label="Social security number" value={employee.ssnMasked} />
        </DataGrid>
      </DataCard>

      {/* Employment Details */}
      <DataCard
        title="Employment details"
        action={<SectionTitle section="employment" employee={employee}/>}
      >
        <DataGrid>
          <DataItem label="Employee ID" value={employee.id} />
          <DataItem label="Hire date" value={extractDateOnly(employee.hireDate)} />
          <DataItem
            label="Employment Type"
            value={employee.employmentType}
            capitalize
          />
          <DataItem
            label="Status"
            value={employee.employmentStatus.toUpperCase()}
          />
          <DataItem label="Department" value={employee.department} />
          <DataItem label="Position" value={employee.position} capitalize />
        </DataGrid>
      </DataCard>

      {/* Tax Withholding */}
      <DataCard
        title="Tax Withholding"
        action={<SectionTitle section="tax" employee={employee} />}
      >
        <DataGrid>
          <DataItem
            label="Federal filing status"
            value={formatText(employee.currentFederalW4?.filingStatus)}
            capitalize
          />
          <DataItem
            label="State filing status"
            value={formatText(
              employee.currentStateTax?.californiaDE4?.filingStatus,
            )}
            capitalize
          />
        </DataGrid>
      </DataCard>

      {/* Base Pay */}
      <DataCard
        title="Base pay"
        action={<SectionTitle section="base" employee={employee} />}
      >
        <DataGrid>
          <DataItem label="Pay type" value={employee.currentCompensation.payType} capitalize />
          <DataItem
            label="Pay rate"
            value={`${formatAmount(employee.currentCompensation.salary, "currency")}/${
              employee.currentCompensation.payType === "hourly" ? "per hour" : "per year"
            }`}
          />
          <DataItem
            label="Pay frequency"
            value={employee.payFrequency}
            capitalize
          />
          <DataItem
            label="Default working hours"
            value={`${employee.currentCompensation.workingHours || 0} hrs/week`}
          />
          <DataItem
            label="Pay method"
            value={employee.currentPayMethod.payMethod}
            capitalize
          />
          <DataItem
            label="Effective Date"
            value={formatDateUTC(employee.currentCompensation.effectiveDate)}
          />
        </DataGrid>
      </DataCard>
    </div>
  )
}

export function DataCard({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn("p-4 gap-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="capitalize font-medium text-lg">{title}</h3>
        {action}
      </div>
      {children}
    </Card>
  )
}

export function DataGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid grid-cols-3 gap-4", className)}>{children}</div>
  )
}

export function DataItem({
  label,
  value,
  capitalize = false,
  valueClassName,
  className,
}: {
  label: string
  value: string | number | ReactNode
  capitalize?: boolean
  valueClassName?: string
  className?: string
}) {
  const displayValue = value ?? "N/A"

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <Label className="text-sm font-medium text-muted-foreground capitalize">
        {label}
      </Label>
      <span
        className={cn(
          "font-medium tracking-wide text-sm",
          capitalize && "capitalize",
          valueClassName
        )}
      >
        {displayValue}
      </span>
    </div>
  )
}

/**
 * Formats text by replacing underscores with spaces
 * Note: Capitalization is handled by DataItem's capitalize prop via CSS
 */
function formatText(text: string | undefined | null): string {
  if (!text) return "N/A"
  return text.replace(/_/g, " ")
}