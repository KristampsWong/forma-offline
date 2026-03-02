import { FileText } from "lucide-react"
import type { StatementImportListItem } from "@/actions/statementimports"

export default function FileThumbnail({ fileName, status, createdAt }: StatementImportListItem) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <FileText className="size-8 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{fileName}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(createdAt).toLocaleDateString()} · {status}
        </p>
      </div>
    </div>
  )
}
