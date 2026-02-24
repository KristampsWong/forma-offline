"use client"

import { Loader2, Mailbox } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { GoogleSignIn } from "@/components/auth/google-sign-in"
import ErrorMessage from "@/components/error-message"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState<"email" | "code">("email")

  const handleBackToEmail = () => {
    setStep("email")
    setCode("")
    setError("")
  }

  const handleEmailSubmit = async (e : React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Call custom wrapper that sets device cookie
      const response = await fetch("/api/auth/request-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include", // Important: Send/receive cookies
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        setError(data.error || "Failed to send magic link")
        setIsLoading(false)
        return
      }

      // Move to code verification step
      setStep("code")
      setIsLoading(false)
    } catch {
      setError("An unexpected error occurred")
      setIsLoading(false)
    }
  }

  const handleCodeSubmit = async (e : React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Verify the code by calling our API
      const response = await fetch("/api/auth/verify-magic-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Invalid verification code")
        setIsLoading(false)
        return
      }

      // Redirect to Better Auth's verify endpoint to complete authentication
      // This ensures cookies are set properly by Better Auth
      window.location.href = data.verifyUrl
    } catch {
      setError("An unexpected error occurred")
      setIsLoading(false)
    }
  }

  if (step === "code") {
    return (
      <div className="p-7 max-w-md min-w-xs text-center border border-border rounded-4xl flex flex-col gap-3">
        <form onSubmit={handleCodeSubmit} className="space-y-4">
          <div className="flex items-center justify-center">
            <Mailbox className="text-primary" />
          </div>

          <p className="text-center text-muted-foreground">
            Enter the code generated from the link sent to
            <br />
            <span className="font-semibold text-foreground">{email}</span>
          </p>

          <Input
            id="code"
            type="text"
            placeholder="Enter verification code"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            maxLength={6}
            required
            disabled={isLoading}
            className="text-center text-lg tracking-widest"
          />

          {error && <ErrorMessage text={error} />}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || code.length !== 6}
          >
            {isLoading && <Loader2 className="animate-spin" />}
            {!isLoading && "Verify Email Address"}
          </Button>
          <div className="text-sm ">
            Not seeing the email in your inbox?{" "}
            <button onClick={handleBackToEmail} className="underline">
              Try sending again.
            </button>
          </div>
        </form>
      </div>
    )
  }

  // Show email input with Google sign-in
  return (
    <div className="p-7 max-w-md min-w-xs text-center border border-border rounded-4xl flex flex-col gap-3">
      <GoogleSignIn />

      <div className="text-muted-foreground text-sm">OR</div>

      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <div className="space-y-2">
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        {error && <ErrorMessage text={error} />}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="animate-spin" />}
          {!isLoading && "Continue with email"}
        </Button>
      </form>

      <div className="text-xs w-full text-muted-foreground leading-relaxed">
        <span>By continuing, you acknowledge Forma&apos;s&nbsp;</span>
        <Link
          href="/#"
          className="underline hover:text-primary transition-colors duration-300"
        >
          Terms of Service
        </Link>
        &nbsp;and&nbsp;
        <Link
          href="/#"
          className="underline hover:text-primary transition-colors duration-300"
        >
          Privacy Policy.
        </Link>
      </div>
    </div>
  )
}
