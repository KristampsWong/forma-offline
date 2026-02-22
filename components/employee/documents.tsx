import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card } from "../ui/card"
export default function Documents({
  employeeName,
  employeeId,
}: {
  employeeName: string
  employeeId: string
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="capitalize font-medium text-lg">Federal Form W-4</h3>
        <Link
          href={`/api/forms/w4?employeeId=${employeeId}`}
          target="_blank"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          View
        </Link>
      </div>
      <div>
        <p className="text-sm">View and download {employeeName}'s Form W-4</p>
      </div>
    </Card>
  )
}
