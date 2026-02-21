import {
  getAllDe9Records,
  getAllDe9cRecords,
  getAllForm940Filings,
  getAllForm941Filings,
  getAllTaxPayments,
} from "@/actions/taxes"
import Header from "@/components/header"
import TaxFilingsTab from "@/components/taxes/tax-filings-tab"
import TaxPaymentsTab from "@/components/taxes/tax-payments-tab"
import { TabNav } from "@/components/ui/tab-nav"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { tab, highlight } = await searchParams
  const activeTab = typeof tab === "string" ? tab : "payments"
  const highlightId = typeof highlight === "string" ? highlight : undefined

  // Fetch all data in parallel
  const [
    de9Result,
    de9cResult,
    taxPaymentsResult,
    form941FilingsResult,
    form940FilingsResult,
  ] = await Promise.all([
    getAllDe9Records(),
    getAllDe9cRecords(),
    getAllTaxPayments(),
    getAllForm941Filings(),
    getAllForm940Filings(),
  ])

  // Check for errors
  if (
    !de9Result.success ||
    !de9cResult.success ||
    !taxPaymentsResult.success ||
    !form941FilingsResult.success ||
    !form940FilingsResult.success
  ) {
    const errors: string[] = []
    if (!de9Result.success) errors.push(`DE9: ${de9Result.error}`)
    if (!de9cResult.success) errors.push(`DE9C: ${de9cResult.error}`)
    if (!taxPaymentsResult.success)
      errors.push(`Tax Payments: ${taxPaymentsResult.error}`)
    if (!form941FilingsResult.success)
      errors.push(`Form 941: ${form941FilingsResult.error}`)
    if (!form940FilingsResult.success)
      errors.push(`Form 940: ${form940FilingsResult.error}`)

    return (
      <main className="p-4 max-w-7xl mx-auto space-y-8 w-full">
        <Header title="Taxes" />
        <div className="text-muted-foreground">
          Error loading tax data: {errors.join(", ")}
        </div>
      </main>
    )
  }

  const { federal941, federal940, caPitSdi, caSuiEtt } = taxPaymentsResult.data

  return (
    <main className="p-4 max-w-7xl mx-auto space-y-8 w-full">
      <Header title="Taxes" />

      <TabNav
        tabs={[
          {
            value: "payments",
            label: "Payments",
            href: "/taxes?tab=payments",
          },
          {
            value: "filings",
            label: "Filings",
            href: "/taxes?tab=filings",
          },
        ]}
        activeTab={activeTab}
      />

      {activeTab === "payments" && (
        <TaxPaymentsTab
          federal941={federal941}
          federal940={federal940}
          caPitSdi={caPitSdi}
          caSuiEtt={caSuiEtt}
        />
      )}

      {activeTab === "filings" && (
        <TaxFilingsTab
          form941Filings={form941FilingsResult.data}
          form940Filings={form940FilingsResult.data}
          de9Records={de9Result.data}
          de9cRecords={de9cResult.data}
          highlightId={highlightId}
        />
      )}
    </main>
  )
}
