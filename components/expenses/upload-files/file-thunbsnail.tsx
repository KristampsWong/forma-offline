import { FileText } from "lucide-react"
import type { StatementImportListItem } from "@/actions/statementimports"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
export default function FileThumbnail({
  _id,
  fileName,
  status,
  createdAt,
}: StatementImportListItem) {
  const url = `/expenses/import/${_id}`
  return (
    <Link className="p-3 flex justify-between gap-2 border rounded-lg hover:bg-card transition-colors duration-300" href={url}>
      <FileText className="size-8 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{fileName}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(createdAt).toLocaleDateString()} · {status}
        </p>
      </div>
    </Link>
  )
}
