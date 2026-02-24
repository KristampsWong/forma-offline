"use client"

import { Check, Copy } from "lucide-react"
import { useEffect, useState } from "react"

import { AuthCard } from "@/components/auth/auth-card"
import { Button } from "@/components/ui/button"
import { logger } from "@/lib/logger"
interface VerificationCodeUIProps {
  token : string
}

export default function VerificationCodeUI({ token } : VerificationCodeUIProps) {
  const [code, setCode] = useState<string>("")
  const [isExpired, setIsExpired] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCode = async () => {
      try {
        const response = await fetch("/api/auth/get-magic-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })

        const data = await response.json()

        if (!response.ok || data.isExpired) {
          setIsExpired(true)
        } else {
          setCode(data.code)
        }
      } catch (error) {
        logger.error("Error fetching code:", error)
        setIsExpired(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCode()
  }, [token])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      logger.error("Failed to copy:", error)
    }
  }

  if (isLoading) {
    return <AuthCard title="Loading..." />
  }

  if (isExpired) {
    return (
      <AuthCard
        title="This link has expired"
        description={
          <>
            If the problem persists, please <u>contact supports</u>.
          </>
        }
      />
    )
  }

  return (
    <AuthCard
      title={"Use verification code to continue"}
      description={
        "Enter this verification code where you first tried to sign in"
      }
    >
      <div className="px-7 py-4 text-5xl text-center border-[0.5px] border-border rounded-xl flex flex-col gap-6">
        {code}
      </div>

      <Button variant="outline" onClick={handleCopy} disabled={isExpired}>
        {copied ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="mr-2 h-4 w-4" />
            Copy code
          </>
        )}
      </Button>
    </AuthCard>
  )
}
