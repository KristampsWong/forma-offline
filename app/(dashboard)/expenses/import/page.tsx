import Header from "@/components/header"

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>
}) {
  const { id } = await searchParams

  if (!id) {
    return (
      <main className="p-4 max-w-7xl mx-auto space-y-8 w-full">
        <Header title="Import Transactions" />
        <p className="text-muted-foreground">No import ID provided.</p>
      </main>
    )
  }

  return (
    <main className="p-4 max-w-7xl mx-auto space-y-8 w-full">
      <Header title="Import Transactions" />
      <p className="text-muted-foreground">
        Statement import <code className="text-foreground">{id}</code> uploaded
        successfully. AI extraction and review coming in Phase 2.
      </p>
    </main>
  )
}
