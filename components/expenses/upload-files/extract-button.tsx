"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { extractTransactions } from "@/actions/statementimports"
import { Button } from "@/components/ui/button"

export default function ExtractButton({ importId }: { importId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleExtract() {
    setLoading(true)
    try {
      const result = await extractTransactions(importId)
      if (result.success) {
        toast.success("Transactions extracted successfully")
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleExtract} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Extracting...
        </>
      ) : (
        <>
          <Sparkles className="size-4" />
          Extract Transactions
        </>
      )}
    </Button>
  )
}
