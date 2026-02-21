"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { approvePayrollRecords } from "@/actions/payroll"
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

interface SubmitPayrollButtonProps {
  payrollIds: string[]
  redirectDate: string // MM-DD-YYYY format (URL param) for redirect after approval
  hasZeroHourEmployees?: boolean
}

export function SubmitPayrollButton({
  payrollIds,
  redirectDate,
  hasZeroHourEmployees,
}: SubmitPayrollButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const result = await approvePayrollRecords(payrollIds)

      if (result.success) {
        if (result.data.alreadyApproved) {
          toast.info("Payroll records were already approved.")
        } else {
          toast.success("Payroll records approved successfully.")
        }

        if (result.data.taxSyncErrors && result.data.taxSyncErrors.length > 0) {
          toast.warning(
            `Tax sync failed for: ${result.data.taxSyncErrors.join(", ")}. Please check the tax forms page.`,
          )
        }
        // redirectDate is MM-DD-YYYY format (URL param)
        const [month, , year] = redirectDate.split("-")
        router.push(`/overview?month=${month}&year=${year}`)
      } else {
        toast.error(result.error || "Failed to approve payroll records.")
      }
    } catch (_error) {
      toast.error("An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {hasZeroHourEmployees ? (
        <Dialog>
          <DialogTrigger asChild>
            <Button disabled={loading}>
              {loading ? "Submitting..." : "Submit Payroll"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Submit Payroll</DialogTitle>
              <DialogDescription>
                At least one employee has 0 hours; approving will finalize $0
                payrolls, and once approved, the payroll is locked and cannot be
                edited.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Submitting..." : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Submitting..." : "Submit Payroll"}
        </Button>
      )}
    </>
  )
}
