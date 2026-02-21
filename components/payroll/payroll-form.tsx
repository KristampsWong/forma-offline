"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { updatePayrollRecord } from "@/actions/payroll"
import { calculatePayrollTaxes } from "@/actions/payroll-calculate"
import EmployeeTaxes from "@/components/payroll/employee-taxes"
import EmployerTaxes from "@/components/payroll/employer-taxes"
import SalaryInput from "@/components/payroll/salary-input"
import { Button, buttonVariants } from "@/components/ui/button"
import { calculateYTDPlusCurrent } from "@/lib/payroll"
import { formatDateParam } from "@/lib/date/utils"
import { cn } from "@/lib/utils"
import type { PayFrequency } from "@/lib/constants/employment-constants"
import type { PayrollRecord, YTDData } from "@/types/payroll"
import PayrollHeader from "@/components/payroll/payroll-header"

export default function PayrollForm({
  payrollRecord,
  ytd,
}: {
  payrollRecord: PayrollRecord
  ytd: YTDData
}) {
  const router = useRouter()
  const payDate = formatDateParam(new Date(payrollRecord.payPeriod.payDate))
  const start = formatDateParam(new Date(payrollRecord.payPeriod.startDate))
  const end = formatDateParam(new Date(payrollRecord.payPeriod.endDate))
  const [isPending, startTransition] = useTransition()
  const isReadOnly = payrollRecord.approvalStatus === "approved"

  const [regularHours, setRegularHours] = useState<number>(
    payrollRecord.hoursWorked.regularHours,
  ) // Default to 80 hours
  const [overtimeHours, setOvertimeHours] = useState<number>(
    payrollRecord.hoursWorked.overtimeHours,
  ) // Default to 0 hours
  const payRate = payrollRecord.compensation.payRate

  const [overtimePayRate, setOvertimePayRate] = useState<number>(
    payRate * 1.5,
  ) // Default to 1.5x hourly rate
  const [commission, setCommission] = useState<number>(
    payrollRecord.earnings.commissionPay,
  ) // Default to 0
  const [otherPay, setOtherPay] = useState<number>(
    payrollRecord.earnings.otherPay,
  ) // Default to 0
  const [currentTotal, setCurrentTotal] = useState<number>(
    payrollRecord.earnings.totalGrossPay,
  )

  const [taxResults, setTaxResults] = useState({
    employeeTaxes: payrollRecord.deductions.taxes,
    employerTaxes: payrollRecord.employerTaxes,
    netPay: payrollRecord.netPay,
  })
  const [isCalculating, setIsCalculating] = useState(false)

  // Current earnings for YTD calculation (use hourly rate)
  const currentRegularPay = regularHours * payRate
  const currentOvertimePay = overtimeHours * overtimePayRate

  // Compute YTD + current data for display
  const ytdPlusCurrent = calculateYTDPlusCurrent(ytd, {
    earnings: {
      regularPay: currentRegularPay,
      overtimePay: currentOvertimePay,
      commissionPay: commission,
      otherPay: otherPay,
      totalGrossPay: currentTotal,
    },
    employeeTaxes: {
      federalIncomeTax: taxResults.employeeTaxes.federalIncomeTax,
      stateIncomeTax: taxResults.employeeTaxes.stateIncomeTax,
      socialSecurityTax: taxResults.employeeTaxes.socialSecurityTax,
      medicareTax: taxResults.employeeTaxes.medicareTax,
      sdi: taxResults.employeeTaxes.sdi,
      total: taxResults.employeeTaxes.total,
    },
    employerTaxes: {
      futa: taxResults.employerTaxes.futa,
      socialSecurityTax: taxResults.employerTaxes.socialSecurityTax,
      medicareTax: taxResults.employerTaxes.medicareTax,
      ett: taxResults.employerTaxes.ett,
      sui: taxResults.employerTaxes.sui,
      total: taxResults.employerTaxes.total,
    },
    netPay: taxResults.netPay,
  })

  // Refs for handling stale responses
  const calculationCounterRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Real-time tax calculation via server API (with debouncing and stale response handling)
  useEffect(() => {
    // Cancel previous pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const currentRequestId = ++calculationCounterRef.current
    const controller = new AbortController()
    abortControllerRef.current = controller

    // Debounce: wait 500ms after user stops typing
    const timer = setTimeout(async () => {
      setIsCalculating(true)

      try {
        const result = await calculatePayrollTaxes({
          employeeId: payrollRecord.employeeId,
          grossPay: currentTotal,
          periodType: payrollRecord.payPeriod.periodType as PayFrequency,
          payPeriodStartDate: payrollRecord.payPeriod.startDate,
        })

        // Only apply the latest response (prevent stale data)
        if (currentRequestId === calculationCounterRef.current) {
          if (!result.success) {
            toast.error(result.error)
            return
          }
          setTaxResults({
            employeeTaxes: result.data.employeeTaxes,
            employerTaxes: result.data.employerTaxes,
            netPay: result.data.netPay,
          })
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Tax calculation error:", error)
          toast.error(
            "Error calculating taxes. Please refresh and try again.",
          )
        }
      } finally {
        if (currentRequestId === calculationCounterRef.current) {
          setIsCalculating(false)
        }
      }
    }, 500) // 500ms debounce

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [
    currentTotal,
    payrollRecord.employeeId,
    payrollRecord.payPeriod.periodType,
    payrollRecord.payPeriod.startDate,
  ])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    startTransition(async () => {
      try {
        const result = await updatePayrollRecord(payrollRecord._id, {
          hoursWorked: {
            regularHours,
            overtimeHours,
            totalHours: regularHours + overtimeHours,
          },
          earnings: {
            regularPay: regularHours * payRate,
            overtimePay: overtimeHours * overtimePayRate,
            bonusPay: 0,
            commissionPay: commission,
            otherPay: otherPay,
            totalGrossPay: currentTotal,
          },
          deductions: {
            taxes: taxResults.employeeTaxes,
          },
          employerTaxes: taxResults.employerTaxes,
          netPay: taxResults.netPay,
        })

        if (result.success) {
          toast.success("Payroll saved successfully!")

          router.push(
            `/payroll?start=${start}&end=${end}&payDate=${payDate}`,
          )
        } else {
          toast.error(result.error || "Failed to save payroll")
        }
      } catch (error) {
        toast.error("An error occurred while saving payroll")
        console.error(error)
      }
    })
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <PayrollHeader
        employee={payrollRecord.employeeInfo}
        address={payrollRecord.address}
        periodStart={payrollRecord.payPeriod.startDate}
        periodEnd={payrollRecord.payPeriod.endDate}
        netPay={taxResults.netPay}
        payDate={payrollRecord.payPeriod.payDate}
      />

      <SalaryInput
        regularHours={regularHours}
        setRegularHours={setRegularHours}
        overtimeHours={overtimeHours}
        setOvertimeHours={setOvertimeHours}
        overtimePayRate={overtimePayRate}
        setOvertimePayRate={setOvertimePayRate}
        commission={commission}
        setCommission={setCommission}
        otherPay={otherPay}
        setOtherPay={setOtherPay}
        payRate={payrollRecord.compensation.payRate}
        ytd={ytdPlusCurrent.salary}
        setCurrentTotal={setCurrentTotal}
        readOnly={isReadOnly}
      />

      <EmployeeTaxes
        employeeTax={taxResults.employeeTaxes}
        setEmployeeTax={(taxes) => setTaxResults((prev) => ({ ...prev, employeeTaxes: taxes }))}
        ytd={ytdPlusCurrent}
        readOnly={true}
      />

      <EmployerTaxes employerTax={taxResults.employerTaxes} ytd={ytdPlusCurrent} />

      {!isReadOnly && (
        <div className="flex justify-end items-center gap-2">
          <Link
            href={`/payroll?start=${start}&end=${end}&payDate=${payDate}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Back
          </Link>
          <Button type="submit" disabled={isPending || isCalculating}>
            {isPending
              ? "Saving..."
              : isCalculating
                ? "Calculating..."
                : "Save Payroll"}
          </Button>
        </div>
      )}
    </form>
  )
}
