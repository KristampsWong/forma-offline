// import {
//   getPayrollRecordById,
//   getPayrollYTDByEmployeeId,
// } from "@/actions/payroll"
// import PayrollForm from "@/components/payroll/payroll-form"
// export default async function Page({
//   params,
// }: {
//   params: Promise<{ id: string }>
// }) {
//   const { id } = await params
//   const payrollRecord = await getPayrollRecordById(id)

//   // Handle error case
//   if (!payrollRecord.success || !payrollRecord.data) {
//     return (
//       <section className="p-4 mx-auto max-w-5xl space-y-16 w-full">
//         <div className="text-center text-destructive">
//           Error loading payroll record: {payrollRecord.error || "Unknown error"}
//         </div>
//       </section>
//     )
//   }

//   // Fetch YTD data for all payroll records BEFORE this pay period starts
//   const payrollYTDRecords = await getPayrollYTDByEmployeeId(
//     payrollRecord.data.employeeId,
//     payrollRecord.data.payPeriod.startDate, // Use startDate to exclude current period
//   )

//   if (!payrollYTDRecords.success || !payrollYTDRecords.data) {
//     return (
//       <section className="p-4 mx-auto max-w-5xl space-y-16 w-full">
//         <div className="text-center text-destructive">
//           Error loading payroll data:{" "}
//           {payrollYTDRecords.error || "Unknown error"}
//         </div>
//       </section>
//     )
//   }

//   return (
//     <section className="p-4 mx-auto max-w-5xl space-y-16 w-full">
//       <PayrollForm
//         payrollRecord={payrollRecord.data}
//         ytd={payrollYTDRecords.data}
//       />
//     </section>
//   )
// }


import React from 'react'

export default function Page() {
  return (
    <div>Page</div>
  )
}
