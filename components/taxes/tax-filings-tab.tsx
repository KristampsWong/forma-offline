import Link from "next/link"
import type { De9RecordList } from "@/actions/taxes/de9-read"
import type { De9cRecordList } from "@/actions/taxes/de9c-read"
import type {
  Form940FilingRecord,
  Form941FilingRecord,
} from "@/actions/taxes/filling-read"
import TaxFilingCard from "@/components/taxes/tax-filing-card"
import TaxSectionHeader from "@/components/taxes/tax-section-header"
import { Card } from "@/components/ui/card"

interface TaxFilingsTabProps {
  form941Filings: Form941FilingRecord[]
  form940Filings: Form940FilingRecord[]
  de9Records: De9RecordList[]
  de9cRecords: De9cRecordList[]
  highlightId?: string
}

export default function TaxFilingsTab({
  form941Filings,
  form940Filings,
  de9Records,
  de9cRecords,
  highlightId,
}: TaxFilingsTabProps) {
  const now = new Date()

  // Filter pending and filed records
  const pendingForm941Filings = form941Filings.filter(
    (filing) => filing.filingStatus !== "filed",
  )
  const filedForm941Filings = form941Filings.filter(
    (filing) => filing.filingStatus === "filed",
  )
  const pendingForm940Filings = form940Filings.filter(
    (filing) => filing.filingStatus !== "filed",
  )
  const filedForm940Filings = form940Filings.filter(
    (filing) => filing.filingStatus === "filed",
  )
  const pendingDe9Records = de9Records.filter(
    (record) => record.status !== "filed",
  )
  const filedDe9Records = de9Records.filter(
    (record) => record.status === "filed",
  )
  const pendingDe9cRecords = de9cRecords.filter(
    (record) => record.status !== "filed",
  )
  const filedDe9cRecords = de9cRecords.filter(
    (record) => record.status === "filed",
  )

  // Check if there are any pending or filed records
  const hasPendingRecords =
    pendingForm941Filings.length > 0 ||
    pendingForm940Filings.length > 0 ||
    pendingDe9Records.length > 0 ||
    pendingDe9cRecords.length > 0
  const hasFiledRecords =
    filedForm941Filings.length > 0 ||
    filedForm940Filings.length > 0 ||
    filedDe9Records.length > 0 ||
    filedDe9cRecords.length > 0

  // Calculate overdue amounts
  const overdueForm941Amount = form941Filings
    .filter(
      (filing) =>
        new Date(filing.dueDate) < now && filing.filingStatus !== "filed",
    )
    .reduce((sum, filing) => sum + filing.balanceDue, 0)

  const overdueForm940Amount = form940Filings
    .filter(
      (filing) =>
        new Date(filing.dueDate) < now && filing.filingStatus !== "filed",
    )
    .reduce((sum, filing) => sum + filing.line14_balanceDue, 0)

  // Calculate overdue DE9 amount
  const overdueDe9Amount = de9Records
    .filter((record) => {
      if (record.status === "filed" || !record.dueDate) return false
      return record.dueDate < now
    })
    .reduce((sum, record) => {
      const parsedAmount = Number.parseFloat(record.totalDue)
      return sum + (Number.isFinite(parsedAmount) ? parsedAmount : 0)
    }, 0)

  // Helper to format Date to MM/DD/YYYY string
  const formatDateString = (date: Date | undefined): string => {
    if (!date) return "N/A"
    return `${String(date.getUTCMonth() + 1).padStart(2, "0")}/${String(
      date.getUTCDate(),
    ).padStart(2, "0")}/${date.getUTCFullYear()}`
  }

  return (
    <div className="space-y-8">
      {/* Form 941 Filings - Pending */}
      {pendingForm941Filings.length > 0 && (
        <div className="space-y-4">
          <TaxSectionHeader
            title="Quarterly Federal Tax Returns"
            amounts={{ overdue: overdueForm941Amount, mandatory: 0 }}
            filings
          />

          {pendingForm941Filings.map((filing) => (
            <TaxFilingCard
              key={filing._id}
              id={filing._id}
              title="Federal Form 941"
              formType="941"
              quarter={filing.quarter}
              year={filing.year}
              periodStart={filing.periodStart}
              periodEnd={filing.periodEnd}
              dueDate={filing.dueDate}
              filingStatus={filing.filingStatus}
              filedDate={filing.filedDate}
              amount={filing.balanceDue}
              overdue={
                new Date(filing.dueDate) < now &&
                filing.filingStatus !== "filed"
              }
              isHighlighted={highlightId === filing._id}
            />
          ))}
        </div>
      )}

      {/* Form 940 Filings - Pending */}
      {pendingForm940Filings.length > 0 && (
        <div className="space-y-4">
          <TaxSectionHeader
            title="Annual Federal Unemployment (FUTA) Tax Return"
            amounts={{ overdue: overdueForm940Amount, mandatory: 0 }}
            filings
          />

          {pendingForm940Filings.map((filing) => (
            <TaxFilingCard
              key={filing._id}
              id={filing._id}
              title="Federal Form 940"
              formType="940"
              year={filing.year}
              periodStart={filing.periodStart}
              periodEnd={filing.periodEnd}
              dueDate={filing.dueDate}
              filingStatus={filing.filingStatus}
              filedDate={filing.filedDate}
              amount={filing.line14_balanceDue}
              overdue={
                new Date(filing.dueDate) < now &&
                filing.filingStatus !== "filed"
              }
              isHighlighted={highlightId === filing._id}
            />
          ))}
        </div>
      )}

      {/* DE9 and DE9C Records - Pending */}
      {(pendingDe9Records.length > 0 || pendingDe9cRecords.length > 0) && (
        <div className="space-y-4">
          <TaxSectionHeader
            title="Quarterly Contribution Return and Report of Wages"
            amounts={{ overdue: overdueDe9Amount, mandatory: 0 }}
            filings
          />
          {pendingDe9Records.map((record) => {
            const parsedAmount = Number.parseFloat(record.totalDue)
            const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0
            const isOverdue =
              record.dueDate &&
              record.dueDate < now &&
              record.status !== "filed"
            return (
              <TaxFilingCard
                key={record._id}
                id={record._id}
                title="CA DE 9"
                formType="de9"
                quarter={record.quarterNum as 1 | 2 | 3 | 4}
                year={record.year}
                dueDate={formatDateString(record.dueDate)}
                filingStatus={record.status}
                filedDate={record.filedDate}
                amount={amount}
                overdue={isOverdue ?? false}
                isHighlighted={highlightId === record._id}
              />
            )
          })}
          {/* DE9C Records - Pending */}
          {pendingDe9cRecords.map((record) => {
            const isOverdue =
              record.dueDate &&
              record.dueDate < now &&
              record.status !== "filed"
            return (
              <TaxFilingCard
                key={record._id}
                id={record._id}
                title="CA DE 9C"
                formType="de9c"
                quarter={record.quarterNum as 1 | 2 | 3 | 4}
                year={record.year}
                dueDate={formatDateString(record.dueDate)}
                filingStatus={record.status}
                filedDate={record.filedDate}
                amount={0}
                overdue={isOverdue ?? false}
                isHighlighted={highlightId === record._id}
              />
            )
          })}
        </div>
      )}

      {/* Done Section for filed filings */}
      {(filedForm941Filings.length > 0 ||
        filedForm940Filings.length > 0 ||
        filedDe9Records.length > 0 ||
        filedDe9cRecords.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between h-7">
            <h2 className="uppercase font-medium text-muted-foreground">
              Done
            </h2>
            <Link
              href="/taxes/filingrecords"
              className="text-sm pr-2 hover:underline"
            >
              View All Filing Records
            </Link>
          </div>

          {filedForm941Filings.map((filing) => (
            <TaxFilingCard
              key={filing._id}
              id={filing._id}
              title="Federal Form 941"
              formType="941"
              quarter={filing.quarter}
              year={filing.year}
              periodStart={filing.periodStart}
              periodEnd={filing.periodEnd}
              dueDate={filing.dueDate}
              filingStatus={filing.filingStatus}
              filedDate={filing.filedDate}
              amount={filing.balanceDue}
              overdue={false}
              isHighlighted={highlightId === filing._id}
            />
          ))}

          {filedForm940Filings.map((filing) => (
            <TaxFilingCard
              key={filing._id}
              id={filing._id}
              title="Federal Form 940"
              formType="940"
              year={filing.year}
              periodStart={filing.periodStart}
              periodEnd={filing.periodEnd}
              dueDate={filing.dueDate}
              filingStatus={filing.filingStatus}
              filedDate={filing.filedDate}
              amount={filing.line14_balanceDue}
              overdue={false}
              isHighlighted={highlightId === filing._id}
            />
          ))}

          {filedDe9Records.map((record) => {
            const parsedAmount = Number.parseFloat(record.totalDue)
            const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0
            return (
              <TaxFilingCard
                key={record._id}
                id={record._id}
                title="CA DE 9"
                formType="de9"
                quarter={record.quarterNum as 1 | 2 | 3 | 4}
                year={record.year}
                dueDate={formatDateString(record.dueDate)}
                filingStatus={record.status}
                filedDate={record.filedDate}
                amount={amount}
                isHighlighted={highlightId === record._id}
              />
            )
          })}

          {filedDe9cRecords.map((record) => (
            <TaxFilingCard
              key={record._id}
              id={record._id}
              title="CA DE 9C"
              formType="de9c"
              quarter={record.quarterNum as 1 | 2 | 3 | 4}
              year={record.year}
              dueDate={formatDateString(record.dueDate)}
              filingStatus={record.status}
              filedDate={record.filedDate}
              amount={0}
              isHighlighted={highlightId === record._id}
            />
          ))}
        </div>
      )}
      {/* 如果没有数据 */}
      {!hasPendingRecords && !hasFiledRecords && (
        <Card className="p-8 text-center text-muted-foreground">
          No tax filing records found. Tax records will be created when you
          approve payroll.
        </Card>
      )}
    </div>
  )
}
