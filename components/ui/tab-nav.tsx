import Link from "next/link";
import { cn } from "@/lib/utils";

interface TabNavProps {
  tabs: {
    value: string;
    label: string;
    href: string;
  }[];
  activeTab: string;
}

export function TabNav({ tabs, activeTab }: TabNavProps) {
  return (
    <div className="text-sm font-medium p-1 rounded-md bg-muted w-fit h-9 inline-flex items-center justify-center">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href}
          className={cn(
            "px-4 py-1.5 rounded-md transition-all whitespace-nowrap",
            activeTab === tab.value
              ? "bg-card shadow text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
