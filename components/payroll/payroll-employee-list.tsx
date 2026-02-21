"use client"

import { useEffect, useMemo, useState } from "react"
import { AmountInput } from "@/components/ui/amount-input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatAmount } from "@/lib/utils"
import type { PayrollTableData } from "@/types/payroll"
import { RoundingToCents } from "@/lib/payroll"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  createEmployeePayrollRecord,
  batchCreateDefaultPayrollRecords,
} from "@/actions/payroll"
interface PayrollEmployeeListProps {
  data: PayrollTableData[]
  startDate: string
  endDate: string
  payDate: string
  hasEddAccount: boolean
}

export default function PayrollEmployeeList({
  data = [],
  startDate,
  endDate,
  payDate,
  hasEddAccount,
}: PayrollEmployeeListProps) {
  // Check for EDD account on page load
  useEffect(() => {
    if (!hasEddAccount) {
      window.location.hash = "#settings/state-rates"
    }
  }, [hasEddAccount])
  const [hoursMap, setHoursMap] = useState<Record<string, number>>(() =>
    Object.fromEntries(data.map((e) => [e.id, e.hours || 0])),
  )
  const [grossPayMap, setGrossPayMap] = useState<Record<string, number>>(() =>
    Object.fromEntries(data.map((e) => [e.id, e.grossPay])),
  )
  const [saveLoading, setSaveLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const router = useRouter()

  const allApproved = useMemo(
    () => data.length > 0 && data.every((e) => e.status === "approved"),
    [data],
  )
  const hasHoursChanged = useMemo(
    () =>
      data.some((row) => {
        const current = hoursMap[row.id] ?? 0
        return current !== row.hours
      }),
    [data, hoursMap],
  )

  // Get only changed employee hours for optimized API calls (used for Save Edits)
  const getChangedEmployeeHours = (): Record<string, number> => {
    const changed: Record<string, number> = {}
    data.forEach((row) => {
      const currentHours = hoursMap[row.id] ?? row.hours
      if (currentHours !== row.hours) {
        changed[row.id] = currentHours
      }
    })
    return changed
  }

  // Get all employee hours (used for Preview Payroll to create records for everyone)
  const getAllEmployeeHours = (): Record<string, number> => {
    const all: Record<string, number> = {}
    data.forEach((row) => {
      all[row.id] = hoursMap[row.id] ?? row.hours
    })
    return all
  }

  // Shared handler for save/preview operations
  const handleBatchPayroll = async (options: {
    setLoading: (loading: boolean) => void
    onSuccess: () => void
    successMessage?: string
    useAllEmployees?: boolean
  }) => {
    const { setLoading, onSuccess, successMessage, useAllEmployees } = options
    setLoading(true)
    try {
      const result = await batchCreateDefaultPayrollRecords(
        startDate,
        endDate,
        payDate,
        useAllEmployees ? getAllEmployeeHours() : getChangedEmployeeHours(),
      )

      if (result.success) {
        if (successMessage) {
          toast.success(successMessage)
        }
        onSuccess()
      } else {
        toast.error(result.error || "Failed to process payroll records.")
      }
    } catch (_error) {
      toast.error("An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-start capitalize w-1/5">name</TableHead>
            <TableHead className="text-start capitalize w-1/5">
              Regular pay
            </TableHead>
            <TableHead className="text-start capitalize w-1/5">
              total hrs
            </TableHead>
            <TableHead className="text-start capitalize w-1/5">
              gross pay
            </TableHead>
            <TableHead className="text-start capitalize w-1/5">
              status
            </TableHead>
            <TableHead className="text-end capitalize w-1/5">actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium text-start">
                  {employee.name}
                </TableCell>
                <TableCell className="font-medium text-start">
                  {formatAmount(employee.regularPay, "currency")}/hr
                </TableCell>
                <TableCell className="font-medium text-start">
                  <AmountInput
                    suffix="/hr"
                    value={hoursMap[employee.id] ?? 0}
                    className="w-24"
                    onChange={(value) => {
                      setHoursMap((prev) => ({ ...prev, [employee.id]: value }))
                      setGrossPayMap((prev) => ({
                        ...prev,
                        [employee.id]: RoundingToCents(
                          employee.regularPay * value,
                        ),
                      }))
                    }}
                  />
                </TableCell>
                <TableCell className="font-medium text-start tracking-wide">
                  {formatAmount(
                    grossPayMap[employee.id] ?? employee.grossPay,
                    "currency",
                  )}
                </TableCell>
                <TableCell className="font-medium text-start capitalize">
                  {employee.status}
                </TableCell>
                <TableCell className="text-end">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasEddAccount && employee.status !== "approved"}
                    onClick={async () => {
                      if (employee.status === "approved") {
                        router.push(`/payroll/${employee.payrollRecordId}`)
                      } else {
                        const res = await createEmployeePayrollRecord(
                          employee.id,
                          startDate,
                          endDate,
                          payDate,
                          hoursMap[employee.id] || 0,
                        )

                        if (!res.success) {
                          toast.error(res.error)
                          return
                        }
                        router.push(`/payroll/${res.data.payrollId}`)
                      }
                    }}
                  >
                    {employee.status === "approved" ? "View" : "Edit"}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                No employees found. Add employees to run payroll.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() =>
            handleBatchPayroll({
              setLoading: setSaveLoading,
              onSuccess: () => router.refresh(),
              successMessage: "Payroll records saved successfully.",
            })
          }
          disabled={
            !hasEddAccount ||
            saveLoading ||
            previewLoading ||
            allApproved ||
            data.length === 0 ||
            !hasHoursChanged
          }
        >
          {saveLoading ? "Saving..." : "Save Edits"}
        </Button>
        <Button
          onClick={() =>
            handleBatchPayroll({
              setLoading: setPreviewLoading,
              onSuccess: () => {
                const params = new URLSearchParams({
                  startDate,
                  endDate,
                  payDate,
                })
                router.push(`/payroll/preview?${params.toString()}`)
              },
              useAllEmployees: true,
            })
          }
          disabled={
            !hasEddAccount ||
            saveLoading ||
            previewLoading ||
            allApproved ||
            data.length === 0
          }
        >
          {previewLoading ? "Loading..." : "Preview Payroll"}
        </Button>
      </div>
    </div>
  )
}
