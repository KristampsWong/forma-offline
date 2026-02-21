import Link from "next/link"
import type { TaxPaymentType } from "@/lib/constants/tax-constants"
import type {
  CAPitSdiRecord,
  CASuiEttRecord,
  Federal940Record,
  Federal941Record,
} from "@/types/taxpayment"
import TaxPaymentsList from "@/components/taxes/tax-payments-list"
import TaxSectionHeader from "@/components/taxes/tax-section-header"
import { Card } from "@/components/ui/card"

type TaxRecord =
  | Federal941Record
  | Federal940Record
  | CAPitSdiRecord
  | CASuiEttRecord

type TaxTypeConfig = {
  title: string
  taxType: TaxPaymentType
  section: "federal" | "state"
}

const TAX_CONFIGS: TaxTypeConfig[] = [
  {
    title: "Federal Payroll Tax Deposit (941)",
    taxType: "federal941",
    section: "federal",
  },
  {
    title: "Federal Unemployment Deposit (940)",
    taxType: "federal940",
    section: "federal",
  },
  {
    title: "CA PIT / SDI Deposit",
    taxType: "caPitSdi",
    section: "state",
  },
  {
    title: "CA SUI / ETT Deposit",
    taxType: "caSuiEtt",
    section: "state",
  },
]

interface TaxPaymentsTabProps {
  federal941: Federal941Record[]
  federal940: Federal940Record[]
  caPitSdi: CAPitSdiRecord[]
  caSuiEtt: CASuiEttRecord[]
}

export default function TaxPaymentsTab({
  federal941,
  federal940,
  caPitSdi,
  caSuiEtt,
}: TaxPaymentsTabProps) {
  const now = new Date()

  // 将所有记录按 taxType 组织
  const allRecords: Record<TaxPaymentType, TaxRecord[]> = {
    federal941,
    federal940,
    caPitSdi,
    caSuiEtt,
  }

  // 按状态过滤记录
  const getRecordsByStatus = (
    taxType: TaxPaymentType,
    status: "pending" | "paid",
  ) => allRecords[taxType].filter((r) => r.status === status)

  // 计算金额的辅助函数
  const calculateAmounts = (section: "federal" | "state") => {
    const sectionConfigs = TAX_CONFIGS.filter((c) => c.section === section)
    const records = sectionConfigs.flatMap((config) =>
      getRecordsByStatus(config.taxType, "pending").map((r) => ({
        totalTax: r.totalTax,
        dueDate: new Date(r.dueDate),
        requiresImmediatePayment:
          "requiresImmediatePayment" in r ? r.requiresImmediatePayment : false,
      })),
    )

    return {
      overdue: records
        .filter((r) => r.dueDate < now && r.requiresImmediatePayment)
        .reduce((sum, r) => sum + r.totalTax, 0),
      mandatory: records
        .filter((r) => r.dueDate >= now && r.requiresImmediatePayment)
        .reduce((sum, r) => sum + r.totalTax, 0),
      optional: records
        .filter((r) => !r.requiresImmediatePayment)
        .reduce((sum, r) => sum + r.totalTax, 0),
    }
  }

  const federalAmounts = calculateAmounts("federal")
  const stateAmounts = calculateAmounts("state")

  // 检查是否有 pending/paid 记录
  const hasPendingInSection = (section: "federal" | "state") =>
    TAX_CONFIGS.filter((c) => c.section === section).some(
      (config) => getRecordsByStatus(config.taxType, "pending").length > 0,
    )

  const hasPaidRecords = TAX_CONFIGS.some(
    (config) => getRecordsByStatus(config.taxType, "paid").length > 0,
  )

  const hasPendingRecords =
    hasPendingInSection("federal") || hasPendingInSection("state")

  // 渲染某个 section 的 pending 列表
  const renderSection = (
    section: "federal" | "state",
    title: string,
    amounts: ReturnType<typeof calculateAmounts>,
  ) => {
    const sectionConfigs = TAX_CONFIGS.filter((c) => c.section === section)
    if (!hasPendingInSection(section)) return null

    return (
      <div className="space-y-4">
        <TaxSectionHeader title={title} amounts={amounts} />
        {sectionConfigs.map((config) => (
          <TaxPaymentsList
            key={config.taxType}
            records={getRecordsByStatus(config.taxType, "pending")}
            title={config.title}
            taxType={config.taxType}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {hasPendingRecords && (
        <div className="space-y-8">
          {renderSection("federal", "Federal", federalAmounts)}
          {renderSection("state", "State", stateAmounts)}
        </div>
      )}

      {/* Done Section */}
      {hasPaidRecords && (
        <div className="space-y-4">
          <div className="flex items-center justify-between h-7">
            <h2 className="uppercase font-medium text-muted-foreground">
              Done
            </h2>
            <Link
              href="/taxes/paymentrecords"
              className="text-sm pr-2 hover:underline"
            >
              View All Payment Records
            </Link>
          </div>
          {TAX_CONFIGS.map((config) => (
            <TaxPaymentsList
              key={config.taxType}
              records={getRecordsByStatus(config.taxType, "paid")}
              title={config.title}
              taxType={config.taxType}
            />
          ))}
        </div>
      )}

      {/* 如果没有数据 */}
      {!hasPendingRecords && !hasPaidRecords && (
        <Card className="p-8 text-center text-muted-foreground">
          No tax payment records found. Tax records will be created when you
          approve payroll.
        </Card>
      )}
    </div>
  )
}
