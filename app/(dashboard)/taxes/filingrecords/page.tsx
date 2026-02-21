import { getFiledFilingRecords } from "@/actions/taxes/filling-read"
import Header from "@/components/header"
//import FilingRecordsTable from "@/components/taxes/filing-records/filing-records-table"
import Breadcrumb, {
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default async function Page() {
  // Get all filed records (no server-side pagination - handled by client)
  const result = await getFiledFilingRecords(1, 100, "all")

  const initialData = result.success
    ? result.data
    : {
        records: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      }

  return (
    <main className="p-4 max-w-7xl mx-auto space-y-8 w-full">
      <Header>
        <Breadcrumb>
          <BreadcrumbLink href="/taxes?tab=filings" text="Taxes" />
          <BreadcrumbSeparator />
          <span className="text-foreground font-semibold">Filing Records</span>
        </Breadcrumb>
      </Header>

      {/* <FilingRecordsTable initialData={initialData} /> */}
    </main>
  )
}
