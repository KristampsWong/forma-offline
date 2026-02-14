import { redirect } from "next/navigation"

import { getCompany } from "@/actions/company"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { getCurrentUser } from "@/lib/auth/auth-helpers"

export default async function Layout({
  children,
} : {
  children : React.ReactNode
}) {
  // CRITICAL: Protect dashboard routes - redirect unauthenticated users to sign-in
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    redirect("/sign-in")
  }

  const companyData = await getCompany()

  return (
    <div id="dashboard-root" className="flex min-h-screen w-full">
      <SidebarProvider>
        <AppSidebar companyData={companyData} />
        {children}
      </SidebarProvider>
    </div>
  )
}
