import Header from "@/components/header"
import { requireAuth } from "@/lib/auth/auth-helpers"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  await searchParams
  const currentUser = await requireAuth()
  const user = currentUser.user

  return (
    <main className="p-4 max-w-7xl mx-auto space-y-8 w-full">
      <Header>
        <h1 className="text-2xl font-semibold">
          Welcome back, {user.name}{" "}
          <span role="img" aria-label="waving hand">
            👋🏻
          </span>
        </h1>
      </Header>
    </main>
  )
}
