import type { EmployeeDetail } from "@/types/employee"

import { BasePaySheet } from "./sheets/base-pay-sheet"
import { EmploymentDetailsSheet } from "./sheets/employment-details-sheet"
import { PersonalDetailsSheet } from "./sheets/personal-details-sheet"
import { TaxWithholdingSheet } from "./sheets/tax-withholding-sheet"

export default function SectionTitle({
  title,
  section,
  employee,
  onUpdate,
}: {
  title?: string
  section: string
  employee?: EmployeeDetail
  onUpdate?: () => void
}) {
  const renderSheet = () => {
    if (!employee) return null

    switch (section) {
      case "personal":
        return <PersonalDetailsSheet employee={employee} onUpdate={onUpdate} />
      case "employment":
        return (
          <EmploymentDetailsSheet employee={employee} onUpdate={onUpdate} />
        )
      case "tax":
        return <TaxWithholdingSheet employee={employee} onUpdate={onUpdate} />
      case "base":
        return <BasePaySheet employee={employee} onUpdate={onUpdate} />
      default:
        return null
    }
  }

  return (
    <div className="flex items-center justify-between">
      <h3 className="capitalize font-medium text-lg">{title}</h3>
      {renderSheet()}
    </div>
  )
}
