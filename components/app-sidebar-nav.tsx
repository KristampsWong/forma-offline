"use client"

import { usePathname } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const navLinks = [
  {
    title: "Payroll",
    url: "#",
    items: [
      {
        title: "Overview",
        url: "/overview",
      },
      {
        title: "Employees",
        url: "/employees",
      },
      {
        title: "Taxes",
        url: "/taxes",
      },
    ],
  },
  {
    title: "Accounting",
    url: "#",
    items: [
      {
        title: "Transactions",
        url: "/bookkeeping",
      },
      {
        title: "Invoices",
        url: "/invoices",
      },
      {
        title: "Expenses",
        url: "/expenses",
      },
      {
        title: "Reports",
        url: "/reports",
      },
    ],
  },
]

export function AppSidebarNav() {
  const pathname = usePathname()

  return (
    <>
      {navLinks.map((item) => (
        <SidebarGroup
          key={item.title}
          className="px-0 group-data-[collapsible=icon]:hidden"
        >
          <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {item.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      pathname === item.url && "font-medium bg-muted"
                    )}
                  >
                    <a href={item.url} className={cn("text-base")}>
                      {item.title}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  )
}
