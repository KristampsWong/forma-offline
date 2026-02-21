"use client"

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  ChevronDown,
  CircleCheck,
  CircleDashed,
  CreditCard,
} from "lucide-react"
import Link from "next/link"
import * as React from "react"
import type { getRecentPayrollActivities } from "@/actions/overview"
import PaycheckActionMenu from "@/components/employee/paycheck-action-menu"
import PayrollMonthPicker from "@/components/overview/payroll-month-picker"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatAmount } from "@/lib/utils"
import { Badge } from "../ui/badge"

type PayrollActivitiesData = Awaited<
  ReturnType<typeof getRecentPayrollActivities>
>

type PayrollActivity = {
  _id: string
  employeeId: string
  employeeName: string
  grossPay: number
  employeeTaxes: number
  netPay: number
  employerTaxes: number
  totalPayrollCost: number
  status: string
}

type PageItem = number | "ellipsis"

function buildPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1)
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages]
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ]
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ]
}

export default function PayrollActivities({
  data,
  month,
  year,
}: {
  data: PayrollActivitiesData
  month: number
  year: number
}) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const columns = React.useMemo<ColumnDef<PayrollActivity>[]>(
    () => [
      {
        accessorKey: "employeeName",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="px-0 hover:bg-transparent"
            >
              Name
            </Button>
          )
        },
        cell: ({ row }) => (
          <Link
            href={`/employees/${row.original.employeeId}`}
            className="font-medium hover:underline"
          >
            {row.getValue("employeeName")}
          </Link>
        ),
      },
      {
        accessorKey: "grossPay",
        header: () => <div className="text-end">Gross Pay</div>,
        cell: ({ row }) => (
          <div className="text-end tracking-wide">
            {formatAmount(row.getValue("grossPay"), "currency")}
          </div>
        ),
      },
      {
        accessorKey: "employeeTaxes",
        header: () => <div className="text-end">Employee Taxes</div>,
        cell: ({ row }) => (
          <div className="text-end tracking-wide">
            {formatAmount(row.getValue("employeeTaxes"), "currency")}
          </div>
        ),
      },
      {
        accessorKey: "netPay",
        header: () => <div className="text-end">Net Salary</div>,
        cell: ({ row }) => (
          <div className="text-end tracking-wide">
            {formatAmount(row.getValue("netPay"), "currency")}
          </div>
        ),
      },
      {
        accessorKey: "employerTaxes",
        header: () => <div className="text-end">Employer Taxes</div>,
        cell: ({ row }) => (
          <div className="text-end tracking-wide">
            {formatAmount(row.getValue("employerTaxes"), "currency")}
          </div>
        ),
      },
      {
        accessorKey: "totalPayrollCost",
        header: ({ column }) => {
          return (
            <div className="text-end">
              <Button
                variant="ghost"
                onClick={() =>
                  column.toggleSorting(column.getIsSorted() === "asc")
                }
                className="px-0 hover:bg-transparent"
              >
                Payroll Cost
              </Button>
            </div>
          )
        },
        cell: ({ row }) => (
          <div className="text-end tracking-wide">
            {formatAmount(row.getValue("totalPayrollCost"), "currency")}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: () => <div className="text-center">Status</div>,
        cell: ({ row }) => (
          <div className="text-end capitalize">
            <Badge variant="outline">
              {row.getValue("status") === "approved" ? (
                <CircleCheck className="size-4 mr-1 inline-block fill-green-400 text-background" />
              ) : (
                <CircleDashed className="size-4 mr-1 inline-block" />
              )}
              {row.getValue("status")}
            </Badge>
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-end">Action</div>,
        cell: ({ row }) => (
          <div className="text-end">
            <PaycheckActionMenu
              paycheckId={row.original._id}
              approvalStatus={row.original.status}
              variant="icon"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [],
  )

  const monthName = new Date(year, month).toLocaleString("en-US", {
    month: "long",
  })

  const lastDay = new Date(year, month + 1, 0).getDate()
  const monthStr = String(month + 1).padStart(2, "0")
  const url = `/payroll?start=${year}-${monthStr}-01&end=${year}-${monthStr}-${String(
    lastDay,
  ).padStart(2, "0")}`

  const stats =
    data.success && data.data
      ? data.data.stats
      : {
          approvedCount: 0,
          pendingCount: 0,
          totalPayrollCost: 0,
          hasEmployee: false,
        }
  const activities = (
    data.success && data.data ? data.data.activities : []
  ) as PayrollActivity[]

  const table = useReactTable({
    data: activities,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
  })

  const pageCount = Math.max(table.getPageCount(), 1)
  const currentPage = table.getState().pagination.pageIndex + 1
  const pageItems = React.useMemo(
    () => buildPageItems(currentPage, pageCount),
    [currentPage, pageCount],
  )
  const prevDisabled = !table.getCanPreviousPage()
  const nextDisabled = !table.getCanNextPage()

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2 max-w-sm w-full">
        <Input
          placeholder="Filter by name..."
          value={
            (table.getColumn("employeeName")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("employeeName")?.setFilterValue(event.target.value)
          }
        
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2 text-muted-foreground font-medium">
            {[
              {
                icon: CircleCheck,
                value: stats.approvedCount.toString(),
                tooltip: "Approved",
              },
              {
                icon: CircleDashed,
                value: stats.pendingCount.toString(),
                tooltip: "Pending",
              },
              {
                icon: CreditCard,
                value: `${formatAmount(stats.totalPayrollCost, "currency")}`,
                tooltip: "Total Paid This Month",
              },
            ].map((item) => (
              <Tooltip key={item.tooltip}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <item.icon className="size-4" />
                    <span>{item.value}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{item.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          <PayrollMonthPicker month={month} year={year} />
        </div>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-3 py-4">
        <div className="text-muted-foreground text-sm whitespace-nowrap">
          {table.getFilteredRowModel().rows.length} row(s) total.
        </div>

        <Pagination className="justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={prevDisabled}
                className={
                  prevDisabled ? "pointer-events-none opacity-50" : undefined
                }
                onClick={(event) => {
                  event.preventDefault()
                  if (!prevDisabled) table.previousPage()
                }}
              />
            </PaginationItem>

            {pageItems.map((item, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: keep it
              <PaginationItem key={`${item}-${index}`}>
                {item === "ellipsis" ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    href="#"
                    isActive={item === currentPage}
                    onClick={(event) => {
                      event.preventDefault()
                      table.setPageIndex(item - 1)
                    }}
                  >
                    {item}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={nextDisabled}
                className={
                  nextDisabled ? "pointer-events-none opacity-50" : undefined
                }
                onClick={(event) => {
                  event.preventDefault()
                  if (!nextDisabled) table.nextPage()
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
