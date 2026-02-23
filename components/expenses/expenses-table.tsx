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
import { ChevronDown, XIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"

import { ExpenseActionMenu } from "@/components/expenses/expense-action-menu"
import PayrollMonthPicker from "@/components/overview/payroll-month-picker"
import { Button } from "@/components/ui/button"
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
import {
  formatDateParam,
  parseDateParam,
} from "@/lib/date/utils"
import { formatAmount } from "@/lib/utils"
import type { ExpenseListItem } from "@/types/expense"

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

const ALL_CATEGORIES = "all"

function getColumns(
  categories: { value: string; label: string }[],
): ColumnDef<ExpenseListItem>[] {
  return [
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="max-w-60 truncate block">
          {row.getValue("description")}
        </span>
      ),
    },
    {
      accessorKey: "categoryName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-0 hover:bg-transparent"
        >
          Category
        </Button>
      ),
      cell: ({ row }) => row.getValue("categoryName"),
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-end">Amount</div>,
      cell: ({ row }) => (
        <div className="text-end tracking-wide">
          {formatAmount(row.getValue("amount"), "currency")}
        </div>
      ),
    },
    {
      accessorKey: "date",
      header: ({ column }) => (
        <div className="text-end">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="px-0 hover:bg-transparent"
          >
            Date
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-end">{row.getValue("date")}</div>
      ),
    },
    {
      accessorKey: "vendor",
      header: () => <div className="text-end">Vendor</div>,
      cell: ({ row }) => (
        <div className="text-end tracking-wide">
          {row.getValue("vendor") || "—"}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-end">Action</div>,
      cell: ({ row }) => (
        <div className="text-end">
          <ExpenseActionMenu
            expense={row.original}
            categories={categories}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ]
}

interface ExpensesTableProps {
  data: ExpenseListItem[]
  categories: { value: string; label: string }[]
}

export function ExpensesTable({ data, categories }: ExpensesTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL search param state
  const currentCategory = searchParams.get("category") ?? ""
  const currentStart = searchParams.get("start") ?? ""
  const currentEnd = searchParams.get("end") ?? ""

  const parsedStart = parseDateParam(currentStart)

  // biome-ignore lint/correctness/useExhaustiveDependencies: categories identity is stable from server
  const columns = React.useMemo(() => getColumns(categories), [categories])

  // TanStack Table state
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "date", desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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

  // URL helpers
  function buildUrl(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null || value === "") {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    const qs = params.toString()
    return qs ? `/expenses?${qs}` : "/expenses"
  }

  function handleCategoryChange(value: string) {
    router.push(buildUrl({ category: value === ALL_CATEGORIES ? null : value }))
  }

  function handleMonthSelect(month: number, year: number) {
    const start = new Date(Date.UTC(year, month, 1))
    const end = new Date(Date.UTC(year, month + 1, 0))
    router.push(buildUrl({ start: formatDateParam(start), end: formatDateParam(end) }))
  }

  function handleClearFilters() {
    router.push("/expenses")
  }

  const hasFilters = currentCategory || currentStart || currentEnd

  const now = new Date()
  const selectedMonth = parsedStart
    ? parsedStart.getUTCMonth()
    : now.getMonth()
  const selectedYear = parsedStart
    ? parsedStart.getUTCFullYear()
    : now.getFullYear()

  return (
    <div className="w-full">
      {/* Filters row */}
      <div className="flex flex-wrap items-end gap-4 pb-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 max-w-sm w-full">
            <Input
              placeholder="Search by description..."
              value={
                (table.getColumn("description")?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table.getColumn("description")?.setFilterValue(event.target.value)
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
                  .map((column) => (
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
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={currentCategory || ALL_CATEGORIES}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PayrollMonthPicker
              month={selectedMonth}
              year={selectedYear}
              onSelect={handleMonthSelect}
            />
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-muted-foreground"
              >
                <XIcon className="size-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md bg-card border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
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
                  No expenses found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
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
              // biome-ignore lint/suspicious/noArrayIndexKey: pagination items
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
