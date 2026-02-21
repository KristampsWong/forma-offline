export default function FormLayout({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-semibold text-xl">{title}</h2>
      {children}
    </div>
  )
}
