import Image from "next/image"

import LoginBackGround from "@/assets/loginbackground.png"
import { LogowithWord } from "@/components/logo"
export default function Layout({ children } : { children : React.ReactNode }) {
  return (
    <div className="grid h-screen w-screen lg:grid-cols-[47%_53%] p-4">
      <div className="flex flex-col min-h-full w-full">
        <LogowithWord />
        <div className="flex-1 flex flex-col mx-auto justify-center space-y-16">
          <div className="text-balance font-semibold px-1 max-w-md">
            <span className="text-3xl">
              Your all-in-one solution for payroll and accounting.
            </span>
            <br />
            <div className="text-muted-foreground pt-4">
              Sign up to start your 30 days free trial
            </div>
          </div>
          {children}
        </div>
      </div>
      <div className="relative h-full w-full overflow-hidden hidden lg:block">
        <Image
          src={LoginBackGround}
          alt="Login Background"
          fill
          className="object-cover rounded-xl aspect-5/4"
        />
        <div className="relative z-10 flex h-full flex-col items-center gap-4 overflow-y-auto p-4 no-scrollbar">
          {data.map((item) => (
            <LoginCard
              key={item.title}
              title={item.title}
              amount={item.amount}
              dueDate={item.dueDate}
              period={item.period}
              badge={item.badge}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

const data = [
  {
    title: "Pending Taxes Payments",
    amount: "$1,250.00",
    dueDate: "10/31/2025",
    period: "July-Sep",
    badge: "Q3-2025",
  },
  {
    title: "Federal tax",
    amount: "$1,000.00",
    dueDate: "10/31/2025",
    period: "July-Sep",
    badge: "Q3-2025",
  },
  {
    title: "State tax",
    amount: "$250.00",
    dueDate: "10/31/2025",
    period: "July-Sep",
    badge: "Q3-2025",
  },
  {
    title: "YTD",
    amount: "$12,500.00",
    dueDate: "N/A",
    period: "Q1-Q3 2025",
    badge: "",
  },
]

export function LoginCard({
  title,
  amount,
  dueDate,
  period,
  badge,
} : {
  title : string
  amount : string
  dueDate : string
  period : string
  badge : string
}) {
  return (
    <div className="flex flex-col justify-between aspect-[0.9/1] w-74 bg-primary-foreground/40 backdrop-blur border-none shadow-none rounded-3xl p-4">
      <div className="space-y-2">
        <div className="font-medium">{title}</div>

        <div className="text-4xl font-semibold">{amount}</div>
        {badge.length > 0 && <div className="text-sm text-end">{badge}</div>}
      </div>

      <div className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          Due by {dueDate}
        </div>
        <div className="text-muted-foreground">Period from {period}</div>
      </div>
    </div>
  )
}
