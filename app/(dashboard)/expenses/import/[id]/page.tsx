import {
  getStatementImportById,
} from "@/actions/statementimports"
import { getExpenseCategories } from "@/actions/expenses"
import Header from "@/components/header"
import Breadcrumb, {
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import PdfViewer from "@/components/expenses/pdf-viewer"
import ExtractPanel from "@/components/expenses/upload-files/extract-button"
import { notFound } from "next/navigation"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [result, categoriesResult] = await Promise.all([
    getStatementImportById(id),
    getExpenseCategories(),
  ])
  if (!result.success) notFound()

  const { fileName, presignedUrl } = result.data
  const categories = categoriesResult.success
    ? categoriesResult.data.map((c) => ({ value: c._id, label: c.name }))
    : []

  return (
    <main className="p-4 max-w-7xl mx-auto space-y-8 w-full">
      <Header>
        <Breadcrumb>
          <BreadcrumbLink href={"/expenses"} text={"Expenses"} />
          <BreadcrumbSeparator />
          <BreadcrumbLink
            href={"/expenses/import"}
            text={"Import Transactions"}
          />
          <BreadcrumbSeparator />
          <span className="text-foreground font-semibold">{fileName}</span>
        </Breadcrumb>
      </Header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="border rounded-lg overflow-hidden h-[calc(100vh-200px)]">
          <PdfViewer url={presignedUrl} />
        </div>
        <div className="lg:col-span-2">
          <ExtractPanel
            importId={id}
            initialStatus={result.data.status}
            initialTransactions={result.data.transactions}
            categories={categories}
          />
        </div>
      </div>
    </main>
  )
}
