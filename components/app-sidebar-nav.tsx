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
    title: "General",
    url: "#",
    items: [
      {
        title: "Overview",
        url: "/overview",
      },
    ],
  },
  {
    title: "Payroll",
    url: "#",
    items: [
      {
        title: "Run Payroll",
        url: "/payroll",
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
        title: "Expenses",
        url: "/expenses",
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
