import { getPaidPaymentRecords } from "@/actions/taxes"
import Header from "@/components/header"
import PaymentRecordsTable from "@/components/taxes/payment-records-table"
import Breadcrumb, {
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default async function Page() {
  // Get all paid records (no server-side pagination - handled by client)
  const result = await getPaidPaymentRecords(1, 100, "all")

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
          <BreadcrumbLink href="/taxes?tab=payments" text="Taxes" />
          <BreadcrumbSeparator />
          <span className="text-foreground font-semibold">Payment Records</span>
        </Breadcrumb>
      </Header>

      <PaymentRecordsTable initialData={initialData} />
    </main>
  )
}
