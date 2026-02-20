import { cn } from "@/lib/utils"

export default function Avatar({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "size-6 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground text-medium",
        className,
      )}
    >
      {name.charAt(0).toUpperCase() || "N"}
    </div>
  )
}
