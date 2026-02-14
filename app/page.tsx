import { redirect } from "next/navigation"

import { checkNeedsOnboarding } from "@/actions/company"
import { getCurrentUser } from "@/lib/auth/auth-helpers"
import { CompanyOnboardingForm } from "@/components/company/onboarding/company-onboarding-form"
import { OnboardingCard } from "@/components/company/onboarding/onboarding-card"
import { OnboardingLayout } from "@/components/company/onboarding/onboarding-layout"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth/auth-client"
export default async function Page() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect("/sign-in")
  }

  const companyId = await checkNeedsOnboarding()

  if (companyId) {
    redirect("/overview")
  }

  return (
    <OnboardingLayout>
      <OnboardingCard
        title="Tell us a little about your business"
        description="Just a little info from you, and we'll take care of the rest"
      >
        <CompanyOnboardingForm />
        <SignOutButton />
      </OnboardingCard>
    </OnboardingLayout>
  )
}

function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server"
        await authClient.signOut()
        redirect("/sign-in")
      }}
    >
      <Button type="submit" variant="ghost" className="w-full">
        Sign Out
      </Button>
    </form>
  )
}