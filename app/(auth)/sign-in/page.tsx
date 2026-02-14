"use client"

import { GoogleSignIn } from "@/components/auth/google-sign-in"

export default function SignInPage() {
  return (
    <div className="flex flex-col h-screen w-screen items-center justify-center">
      <div className="p-7 max-w-md w-full min-w-xs text-center border border-border rounded-4xl flex flex-col gap-3">
        <GoogleSignIn />
      </div>
    </div>
  )
}
