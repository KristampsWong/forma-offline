import { Plus, Settings } from "lucide-react"
import Link from "next/link"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import type { ICompany } from "@/models/company"
import type { LeanDoc } from "@/types/db"

import { AppSidebarNav } from "./app-sidebar-nav"
// import { SettingsDialogHost } from "./company/settings/settings-dialog-host"
import { buttonVariants } from "./ui/button"

export type SidebarUserInfo = {
  name : string | null
  email : string | null
  avatarUrl : string | null
}

export function AppSidebar({
  companyData,
} : {
  companyData : LeanDoc<ICompany> | null
}) {
  // Serialize company data for the Client Component (SettingsDialogHost)
  // This converts MongoDB objects (Date, ObjectId) to plain values
  // const serializedCompanyData = serializeForClient(companyData)

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader>
        <div className=" border-b border-border py-2 flex items-center justify-between group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2 transition-all duration-300 ease-in-out">
          <Link
            href="/overview"
            className="text-lg font-semibold pl-1 group-data-[collapsible=icon]:hidden line-clamp-1"
            data-testid="sidebar-company-name"
            title={companyData?.name || "Your Company"}
          >
            {companyData?.name || "Your Company"}
          </Link>
          <SidebarTrigger className="size-8 transition-all duration-300 ease-in-out" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <Link
                href="/payroll"
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "w-full flex justify-center items-center gap-4"
                )}
              >
                <span className="group-data-[collapsible=icon]:hidden">
                  Run Payroll
                </span>
                <Plus className="size-4" />
              </Link>
            </SidebarMenu>
            <AppSidebarNav />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <a
          href="#settings/company"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "flex justify-start items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2 transition-all duration-300 ease-in-out"
          )}
        >
          <Settings className="size-4" />
          <span className="text-sm group-data-[collapsible=icon]:hidden">
            Settings
          </span>
        </a>
      </SidebarFooter>
      {/* <SettingsDialogHost companyData={serializedCompanyData} /> */}
    </Sidebar>
  )
}
