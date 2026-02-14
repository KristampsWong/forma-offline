import { cn } from "@/lib/utils"
export default function ErrorMessage({
  text,
  className,
} : {
  text : string
  className ?: string
}) {
  return (
    <div
      className={cn(
        "text-sm border border-destructive rounded-xl p-4 text-destructive bg-destructive/10 text-center",
        className
      )}
    >
      {text}
    </div>
  )
}
