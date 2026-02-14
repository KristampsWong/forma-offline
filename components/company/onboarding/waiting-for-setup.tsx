"use client"

import { Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { OnboardingCard } from "@/components/company/onboarding/onboarding-card"
import { OnboardingLayout } from "@/components/company/onboarding/onboarding-layout"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth/auth-client"

export function WaitingForSetup() {
  const router = useRouter()

  const handleCheckAgain = () => {
    toast.info("Checking for updates...")
    router.refresh() // Refresh to re-check server-side onboarding status
  }

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push("/sign-in")
  }

  return (
    <OnboardingLayout>
      <OnboardingCard
        align="center"
        icon={<Clock className="h-12 w-12 text-muted-foreground" />}
        title="Your account is being set up"
        description="Please complete the company setup before you can access the dashboard."
      >
        <div className="flex flex-col gap-3 w-full">
          <Button
            variant="outline"
            onClick={handleCheckAgain}
            className="w-full"
          >
            Check Again
          </Button>

          <Button variant="ghost" onClick={handleSignOut} className="w-full">
            Sign Out
          </Button>
        </div>
      </OnboardingCard>
    </OnboardingLayout>
  )
}
