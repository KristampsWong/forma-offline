import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type React from "react";
export default function Breadcrumb({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground text-2xl font-semibold">
      {children}
    </div>
  );
}

export function BreadcrumbLink({ href, text }: { href: string; text: string }) {
  return (
    <Link href={href} className="hover:text-foreground transition-colors ">
      {text}
    </Link>
  );
}

export function BreadcrumbSeparator() {
  return <ChevronRight />;
}
