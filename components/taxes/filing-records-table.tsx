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
} from "@tanstack/react-table"
import { format } from "date-fns"
import { CircleCheck } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import type { FilingRecordItem } from "@/actions/taxes"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn, formatAmount } from "@/lib/utils"

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

const columns: ColumnDef<FilingRecordItem>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="px-0 hover:bg-transparent"
      >
        Title
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("title")}</span>
    ),
  },
  {
    accessorKey: "filedDate",
    header: () => <div className="text-end">Filed Date</div>,
    cell: ({ row }) => {
      const filedDate = row.getValue("filedDate") as Date | undefined
      return (
        <div className="text-end">
          {filedDate ? format(new Date(filedDate), "MM/dd/yyyy") : "-"}
        </div>
      )
    },
  },
  {
    accessorKey: "quarter",
    header: () => <div className="text-end pr-1">Quarter</div>,
    cell: ({ row }) => {
      const quarter = row.getValue("quarter") as string | undefined
      const year = row.original.year
      return (
        <div className="text-end">
          {quarter ? `${quarter} ${year}` : `${year}`}
        </div>
      )
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <div className="text-end">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-0 hover:bg-transparent"
        >
          Amount
        </Button>
      </div>
    ),
    cell: ({ row }) => {
      const amount = row.getValue("amount") as number
      return (
        <div className="text-end tracking-wide">
          {formatAmount(amount, "currency")}
        </div>
      )
    },
  },
  {
    accessorKey: "filingStatus",
    size: 100,
    header: () => <div className="text-end pr-2">Status</div>,
    cell: ({ row }) => {
      const status = row.getValue("filingStatus") as string
      return (
        <div className="text-end">
          <Badge variant="outline">
            <CircleCheck className="size-4 mr-1 inline-block fill-green-400 text-background" />
            {status === "filed" ? "Filed" : status}
          </Badge>
        </div>
      )
    },
  },
  {
    id: "actions",
    size: 120,
    header: () => <div className="text-end pr-8">Actions</div>,
    cell: ({ row }) => {
      const formType = row.original.formType
      const id = row.original._id
      const previewHref =
        formType === "941"
          ? `/api/forms/fill941?id=${id}`
          : formType === "940"
            ? `/api/forms/fill940?id=${id}`
            : formType === "de9c"
              ? `/de9c/${id}`
              : `/de9/${id}`
      return (
        <div className="text-end">
          <Link
            href={previewHref}
            className={cn(buttonVariants({ variant: "outline" }))}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Filing
          </Link>
        </div>
      )
    },
  },
]

interface FilingRecordsTableProps {
  initialData: {
    records: FilingRecordItem[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export default function FilingRecordsTable({
  initialData,
}: FilingRecordsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  )
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [quarterFilter, setQuarterFilter] = React.useState<string>("all")
  const [yearFilter, setYearFilter] = React.useState<string>("all")

  // Get unique years from records
  const availableYears = React.useMemo(() => {
    const years = [...new Set(initialData.records.map((r) => r.year))]
    return years.sort((a, b) => b - a) // Sort descending (newest first)
  }, [initialData.records])

  // Filter data by quarter and year
  const filteredData = React.useMemo(() => {
    return initialData.records.filter((record) => {
      const quarterMatch =
        quarterFilter === "all" || record.quarter === quarterFilter
      const yearMatch =
        yearFilter === "all" || record.year === Number(yearFilter)
      return quarterMatch && yearMatch
    })
  }, [initialData.records, quarterFilter, yearFilter])

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
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
        <Input
          placeholder="Filter by title..."
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("title")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Select value={quarterFilter} onValueChange={setQuarterFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by quarter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Quarters</SelectItem>
              <SelectItem value="Q1">Q1</SelectItem>
              <SelectItem value="Q2">Q2</SelectItem>
              <SelectItem value="Q3">Q3</SelectItem>
              <SelectItem value="Q4">Q4</SelectItem>
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Filter by year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="overflow-hidden rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() }}
                    >
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
                    <TableCell
                      key={cell.id}
                      className="py-4"
                      style={{ width: cell.column.getSize() }}
                    >
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
                  No filing records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-3 py-4">
        <div className="text-muted-foreground text-sm whitespace-nowrap">
          {table.getFilteredRowModel().rows.length} record(s) total.
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
