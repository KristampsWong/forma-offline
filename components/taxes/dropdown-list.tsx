"use client"
import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { cn, formatAmount } from "@/lib/utils"

export type DropdownListProps = {
  totalTax: number
  // Federal 941
  federalIncomeTax?: number
  socialSecurityTax?: number
  socialSecurityEmployerTax?: number
  medicareTax?: number
  medicareEmployerTax?: number
  // Federal 940
  futaEmployer?: number
  // CA PIT/SDI
  caIncomeTax?: number
  caStateDisabilityIns?: number
  // CA SUI/ETT
  caSuiEmployer?: number
  caEtt?: number
}

export default function DropdownList({
  federalIncomeTax,
  socialSecurityTax,
  socialSecurityEmployerTax,
  medicareTax,
  medicareEmployerTax,
  futaEmployer,
  caIncomeTax,
  caStateDisabilityIns,
  caSuiEmployer,
  caEtt,
  totalTax,
}: DropdownListProps) {
  const [isOpen, setIsOpen] = useState(false)

  // 构建税务项列表（只显示有值的项）
  const taxItems: { label: string; value: number }[] = []

  if (federalIncomeTax) {
    taxItems.push({ label: "Federal Income Tax", value: federalIncomeTax })
  }
  if (socialSecurityTax) {
    taxItems.push({
      label: "Social Security",
      value: socialSecurityTax,
    })
  }
  if (socialSecurityEmployerTax) {
    taxItems.push({
      label: "Social Security Employer",
      value: socialSecurityEmployerTax,
    })
  }
  if (medicareTax) {
    taxItems.push({ label: "Medicare", value: medicareTax })
  }
  if (medicareEmployerTax) {
    taxItems.push({ label: "Medicare Employer", value: medicareEmployerTax })
  }
  if (futaEmployer) {
    taxItems.push({ label: "FUTA Employer", value: futaEmployer })
  }
  if (caIncomeTax) {
    taxItems.push({ label: "CA Income Tax", value: caIncomeTax })
  }
  if (caStateDisabilityIns) {
    taxItems.push({
      label: "CA State Disability Ins",
      value: caStateDisabilityIns,
    })
  }
  if (caSuiEmployer) {
    taxItems.push({ label: "CA SUI Employer", value: caSuiEmployer })
  }
  if (caEtt) {
    taxItems.push({ label: "CA ETT", value: caEtt })
  }

  return (
    <div>
      <button
        type="button"
        className="font-medium flex gap-2 w-full justify-end"
        onClick={() => setIsOpen(!isOpen)}
      >
        {formatAmount(totalTax, "currency")}
        <ChevronDown
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out w-64",
          isOpen ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0",
        )}
      >
        <div className="text-muted-foreground text-sm space-y-2">
          {taxItems.map((item) => (
            <div key={item.label} className="flex justify-between items-center">
              <div>{item.label}:</div>
              <div>{formatAmount(item.value, "currency")}</div>
            </div>
          ))}
          <hr />
          <div className="flex justify-between items-center">
            <div className="font-medium">Total:</div>
            <div>{formatAmount(totalTax, "currency")}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
