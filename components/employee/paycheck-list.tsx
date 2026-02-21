import PaycheckActionMenu from "@/components/employee/paycheck-action-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Paycheck } from "@/types/paycheck"

export default function PaycheckList({
  paycheckList,
}: {
  paycheckList: Paycheck[]
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className=" grid grid-cols-7 ">
          <TableHead className="text-start capitalize ">pay period</TableHead>
          <TableHead className="text-end capitalize ">Pay date</TableHead>
          <TableHead className="text-end capitalize">total pay</TableHead>
          <TableHead className="text-end capitalize">net pay</TableHead>
          <TableHead className="text-center capitalize">pay method</TableHead>
          <TableHead className="text-center capitalize">status</TableHead>
          <TableHead className="text-end capitalize ">action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paycheckList.map((paycheck) => (
          <TableRow
            key={paycheck._id}
            className=" grid grid-cols-7 items-center"
          >
            <TableCell className="font-medium text-start">
              {new Date(paycheck.periodStart).toLocaleDateString("en-US", {
                timeZone: "UTC",
                month: "2-digit",
                day: "2-digit",
                year: "numeric",
              })}{" "}
              -{" "}
              {new Date(paycheck.periodEnd).toLocaleDateString("en-US", {
                timeZone: "UTC",
                month: "2-digit",
                day: "2-digit",
                year: "numeric",
              })}
            </TableCell>
            <TableCell className="font-medium text-end">
              {new Date(paycheck.payDate).toLocaleDateString("en-US", {
                timeZone: "UTC",
                month: "2-digit",
                day: "2-digit",
                year: "numeric",
              })}
            </TableCell>
            <TableCell className="font-medium text-end">
              ${paycheck.grossPay.toFixed(2)}
            </TableCell>
            <TableCell className="font-medium text-end">
              ${paycheck.netPay.toFixed(2)}
            </TableCell>
            <TableCell className="font-medium text-center capitalize">
              {paycheck.method}
            </TableCell>
            <TableCell className="font-medium text-center capitalize">
              {paycheck.approvalStatus}
            </TableCell>
            <TableCell className="font-medium text-end capitalize">
              <PaycheckActionMenu
                paycheckId={paycheck._id}
                approvalStatus={paycheck.approvalStatus}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
