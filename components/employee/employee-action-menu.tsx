"use client"

import { TriangleAlert } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import { deleteEmployee } from "@/actions/employee"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface EmployeeActionMenuProps {
  hasPayrolls: boolean
  fullName: string
  employeeId: string
}

export function EmployeeActionMenu({
  hasPayrolls,
  fullName,
  employeeId,
}: EmployeeActionMenuProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteEmployee(employeeId)
      if (res.success) {
        toast.success(`Deleted ${fullName}`)
        router.push("/employees")
        router.refresh()
      } else {
        toast.error(res.error || "Failed to delete employee.")
      }
    })
  }

  return (
    <Dialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default">Action</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <DialogTrigger className="w-full text-left">Delete</DialogTrigger>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex justify-baseline">
            {hasPayrolls
              ? "You can't delete this employee"
              : "Permanently delete employee"}
            <TriangleAlert className="inline size-6 ml-2 text-destructive" />
          </DialogTitle>
        </DialogHeader>
        {hasPayrolls ? (
          <div className="text-sm">
            {fullName} has already been paid at least once, so their records
            must be kept for compliance. If they&apos;re no longer active,
            <span> select Cancel and terminate them instead.</span>
          </div>
        ) : (
          <div>
            Delete {fullName} will remove all their data permanently. This
            action cannot be undone.
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          {!hasPayrolls && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
