import Header from "@/components/header"
import Breadcrumb, {
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { UploadExpenseDialog } from "@/components/expenses/upload-files/upload-expense-dialog"
import {getStatementImports} from "@/actions/statementimports"
import FileThumbnail from "@/components/expenses/upload-files/file-thunbsnail"
export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>
}) {
  const { id } = await searchParams
  const result = await getStatementImports()
  const files = result.success ? result.data : []

  return (
    <main className="p-4 max-w-7xl mx-auto space-y-8 w-full">
      <Header>
        <Breadcrumb>
          <BreadcrumbLink href={"/expenses"} text={"Expenses"} />
          <BreadcrumbSeparator />
          <span className="text-foreground font-semibold">
            Import Transactions
          </span>
        </Breadcrumb>
        <UploadExpenseDialog />
      </Header>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {files.map((file) => (
          <FileThumbnail key={file._id} {...file} />
        ))}
      </section>
    </main>
  )
}
