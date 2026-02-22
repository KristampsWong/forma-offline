'use client'
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import { formatAmount } from "@/lib/utils"
import type { Address } from "@/types/employee"
import type { PayrollRecordWithEmployee } from "@/types/paycheck"
import type { YTDData } from "@/types/payroll"
import dynamic from "next/dynamic"
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => <p>Loading...</p>,
  },
)
const styles = StyleSheet.create({
  section: {
    marginTop: 12,

    paddingTop: 24,
    paddingLeft: 72,
    paddingRight: 72,
    paddingBottom: 20,
    height: "28%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    gap: 20,
  },
  paysubdetail: {
    flexDirection: "column",
    width: "100%",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  receiption: {},
  title: { fontSize: 10 },
  text: { fontSize: 10 },
})

const stylesSectionTwo = StyleSheet.create({
  table: {
    paddingTop: 32,
    paddingLeft: 32,
    paddingRight: 32,
    paddingBottom: 32,

    flexDirection: "column",
    gap: 20,
  },
  title: { fontSize: 9, fontWeight: "bold" },
  text: { fontSize: 9 },
  header: {
    fontWeight: "bold",
    fontSize: 10,
  },
  sectionone: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
  },
  sectionOneItem: { width: "50%", flexDirection: "column", gap: 1 },
  payperioditem: {
    flexDirection: "row",
    width: "70%",
    justifyContent: "space-between",
  },
  payTable: {
    flexDirection: "column",
    width: "50%",
  },
  payRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  payHeader: {
    borderBottom: "1px solid black",
  },
  payColDescription: { width: "30%" },
  payColHours: { width: "15%", textAlign: "center" },
  payColRate: { width: "15%", textAlign: "center" },
  payColAmount: { width: "20%", textAlign: "right" },
  payColYtd: { width: "20%", textAlign: "right" },
  deductionsColDescription: { width: "50%" },
  deductionsColAmount: { width: "30%", textAlign: "right" },
  deductionsColYtd: { width: "20%", textAlign: "right" },
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
  },
  taxesTable: {
    width: "50%",
  },
  taxesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  taxesColDescription: { width: "65%" },
  taxesColAmount: { width: "17.5%", textAlign: "right" },
  summaryTable: {
    width: "50%",
    border: "1px solid black",
    flexDirection: "column",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 4,
    paddingRight: 4,
  },
  summaryHeader: {
    borderBottom: "1px solid black",
  },
  summaryColDescription: { width: "45%" },
  summaryColAmount: { width: "27.5%", textAlign: "right" },
  netPayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "50%",
    alignSelf: "flex-end",
    paddingLeft: 10,
  },
})
export function PayrollDocument({
  data,
  type,
  ytd,
}: {
  data: PayrollRecordWithEmployee
  type?: string
  ytd: YTDData
}) {
  const { street1, street2, city, state, zipCode } = data.employee
    .homeAddress as Address
  const payRows = [
    {
      label: "Regular Pay",
      hours: data.hoursWorked,
      rate: data.employee.payRate,
      current: data.earnings.regularPay,
      ytd: ytd.salary.regularPay,
    },
    {
      label: "Overtime Pay",
      hours: data.earnings.overtimeHours,
      rate: data.earnings.overtimeRate,
      current: data.earnings.overtimePay,
      ytd: ytd.salary.overtimePay,
    },
    {
      label: "Commission",
      hours: "-",
      rate: "-",
      current: data.earnings.commissionPay,
      ytd: ytd.salary.commissionPay,
    },
    {
      label: "Other Pay",
      hours: "-",
      rate: "-",
      current: data.earnings.otherPay,
      ytd: ytd.salary.otherPay,
    },
  ]
  const placeholderDeductionRows = payRows.length || 1
  const placeholderDeductionKeys = Array.from(
    { length: placeholderDeductionRows },
    (_, index) => `deduction-placeholder-${index + 1}`,
  )
  const taxesRows = [
    {
      label: "Social Security",
      current: data.taxes.socialSecurity,
      ytd: ytd.totalSocialSecurity,
    },
    {
      label: "CA Income Tax",
      current: data.taxes.californiaIncome,
      ytd: ytd.totalStateTax,
    },
    {
      label: "Federal Income Tax",
      current: data.taxes.federalIncome,
      ytd: ytd.totalFederalTax,
    },

    {
      label: "Medicare",
      current: data.taxes.medicare,
      ytd: ytd.totalMedicare,
    },

    {
      label: "CA State Disability Ins",
      current: data.taxes.caSdi,
      ytd: ytd.totalSDI,
    },
  ]
  const totalPayCurrent = payRows.reduce((sum, row) => sum + row.current, 0)
  const totalPayYtd = payRows.reduce((sum, row) => sum + row.ytd, 0)
  const totalTaxesCurrent = taxesRows.reduce(
    (sum, row) => sum + (row.current ?? 0),
    0,
  )
  const totalTaxesYtd = taxesRows.reduce((sum, row) => sum + (row.ytd ?? 0), 0)
  const deductionsCurrent = 0
  const deductionsYtd = ytd.totalDeductions ?? 0
  const summaryRows = [
    {
      label: "Total Pay",
      current: totalPayCurrent,
      ytd: totalPayYtd,
    },
    {
      label: "Taxes",
      current: totalTaxesCurrent,
      ytd: totalTaxesYtd,
    },
    {
      label: "Deductions",
      current: deductionsCurrent,
      ytd: deductionsYtd,
    },
  ]
  return (
    <PDFViewer style={{ width: "100%", height: "100vh" }}>
      <Document>
        <Page size="LETTER">
          <View
            style={[
              styles.section,
              {
                borderBottom: "5px solid rgb(15,1,123)",
                borderTop: "5px solid rgb(15,1,123)",
              },
            ]}
          >
            <View style={{ flexDirection: "column", gap: 2 }}>
              <Text style={styles.title}>{data.employer.companyName}</Text>
              <Text style={styles.text}>
                {data.employer.companyAddress.line1},
                {data.employer.companyAddress.line2 || ""}
              </Text>
              <Text style={styles.text}>
                {data.employer.companyAddress.city},{" "}
                {data.employer.companyAddress.state}{" "}
                {data.employer.companyAddress.zip}
              </Text>
            </View>
            <View
              style={[styles.paysubdetail, { flexDirection: "column", gap: 2 }]}
            >
              <Text style={styles.title}>Pay Stub Detail</Text>
              <Text style={styles.text}>
                PAY DATE:{" "}
                {new Date(data.payDate).toLocaleDateString("en-US", {
                  timeZone: "UTC",
                })}
              </Text>
              <Text style={styles.text}>
                NET PAY: {formatAmount(data.netPay ?? 0, "currency")}
              </Text>
            </View>
            <View
              style={[styles.receiption, { flexDirection: "column", gap: 2 }]}
            >
              <Text style={styles.title}>
                {data.employee.firstName} {data.employee.lastName}
              </Text>
              <Text style={styles.text}>
                {street1}
                {street2 ? `, ${street2}` : ""}
              </Text>
              <Text style={styles.text}>
                {city}, {state} {zipCode}
              </Text>
            </View>
          </View>

          <View
            style={[
              stylesSectionTwo.table,
              {
                borderBottom:
                  type === "paystub" ? "1px dashed lightgray" : "none",
              },
            ]}
          >
            <View style={stylesSectionTwo.sectionone}>
              <View style={stylesSectionTwo.sectionOneItem}>
                <Text style={stylesSectionTwo.title}>EMPLOYER</Text>
                <Text style={stylesSectionTwo.text}>
                  {data.employer.companyName}
                </Text>
                <Text style={stylesSectionTwo.text}>
                  {data.employer.companyAddress.line1},{" "}
                  {data.employer.companyAddress.line2 || ""}
                </Text>
                <Text style={stylesSectionTwo.text}>
                  {data.employer.companyAddress.city},{" "}
                  {data.employer.companyAddress.state}{" "}
                  {data.employer.companyAddress.zip}
                </Text>
              </View>

              <View style={stylesSectionTwo.sectionOneItem}>
                <Text style={stylesSectionTwo.title}>PAY PERIOD</Text>
                <View style={stylesSectionTwo.payperioditem}>
                  <Text style={stylesSectionTwo.text}>Period Beginning:</Text>
                  <Text style={stylesSectionTwo.text}>
                    {new Date(data.periodStart).toLocaleDateString("en-US", {
                      timeZone: "UTC",
                    })}
                  </Text>
                </View>
                <View style={stylesSectionTwo.payperioditem}>
                  <Text style={stylesSectionTwo.text}>Period Ending:</Text>
                  <Text style={stylesSectionTwo.text}>
                    {new Date(data.periodEnd).toLocaleDateString("en-US", {
                      timeZone: "UTC",
                    })}
                  </Text>
                </View>
                <View style={stylesSectionTwo.payperioditem}>
                  <Text style={stylesSectionTwo.text}>Pay Date:</Text>
                  <Text style={stylesSectionTwo.text}>
                    {new Date(data.payDate).toLocaleDateString("en-US", {
                      timeZone: "UTC",
                    })}
                  </Text>
                </View>
                <View style={stylesSectionTwo.payperioditem}>
                  <Text style={stylesSectionTwo.text}>Total Hours:</Text>
                  <Text style={stylesSectionTwo.text}>{data.hoursWorked}</Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: "column", gap: 1 }}>
              <Text style={stylesSectionTwo.title}>EMPLOYEE</Text>
              <Text style={stylesSectionTwo.text}>
                {data.employee.firstName} {data.employee.lastName}
              </Text>
              <Text style={stylesSectionTwo.text}>
                {street1}
                {street2 ? `, ${street2}` : ""}
              </Text>
              <Text style={stylesSectionTwo.text}>
                {city}, {state} {zipCode}
              </Text>
              <Text style={[stylesSectionTwo.text, { marginTop: 8 }]}>
                SS#: ....{data.employee.ssn}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                width: "50%",
                alignSelf: "flex-end",
                paddingLeft: 10,
              }}
            >
              <Text style={[stylesSectionTwo.text, { fontWeight: "bold" }]}>
                NET PAY:
              </Text>
              <Text style={[stylesSectionTwo.text, { fontWeight: "bold" }]}>
                {formatAmount(data.netPay ?? 0, "currency")}
              </Text>
            </View>
            <Text style={[stylesSectionTwo.text, { fontWeight: "bold" }]}>
              MEMO:
            </Text>
          </View>
          <View
            style={{
              paddingTop: 32,
              paddingLeft: 32,
              paddingRight: 32,
              flexDirection: "column",
              gap: 80,
              paddingBottom: 32,
            }}
          >
            <View style={{ flexDirection: "row", gap: 20 }}>
              <View style={stylesSectionTwo.payTable}>
                <View
                  style={[stylesSectionTwo.payRow, stylesSectionTwo.payHeader]}
                >
                  <Text
                    style={[
                      stylesSectionTwo.text,
                      stylesSectionTwo.payColDescription,
                      { fontWeight: "bold" },
                    ]}
                  >
                    PAY
                  </Text>

                  <Text
                    style={[
                      stylesSectionTwo.text,
                      stylesSectionTwo.payColHours,
                      { fontWeight: "bold" },
                    ]}
                  >
                    Hours
                  </Text>
                  <Text
                    style={[
                      stylesSectionTwo.text,
                      stylesSectionTwo.payColRate,
                      { fontWeight: "bold" },
                    ]}
                  >
                    Rate
                  </Text>

                  <Text
                    style={[
                      stylesSectionTwo.text,
                      stylesSectionTwo.payColAmount,
                      { fontWeight: "bold" },
                    ]}
                  >
                    Current
                  </Text>
                  <Text
                    style={[
                      stylesSectionTwo.text,
                      stylesSectionTwo.payColYtd,
                      { fontWeight: "bold" },
                    ]}
                  >
                    YTD
                  </Text>
                </View>
                {payRows
                  .filter((row) => row.ytd > 0)
                  .map((row) => (
                    <View key={row.label} style={stylesSectionTwo.payRow}>
                      <Text
                        style={[
                          stylesSectionTwo.text,
                          stylesSectionTwo.payColDescription,
                        ]}
                      >
                        {row.label}
                      </Text>

                      <Text
                        style={[
                          stylesSectionTwo.text,
                          stylesSectionTwo.payColHours,
                        ]}
                      >
                        {row.hours}
                      </Text>
                      <Text
                        style={[
                          stylesSectionTwo.text,
                          stylesSectionTwo.payColRate,
                        ]}
                      >
                        {row.rate}
                      </Text>

                      <Text
                        style={[
                          stylesSectionTwo.text,
                          stylesSectionTwo.payColAmount,
                        ]}
                      >
                        {formatAmount(row.current ?? 0)}
                      </Text>
                      <Text
                        style={[
                          stylesSectionTwo.text,
                          stylesSectionTwo.payColYtd,
                        ]}
                      >
                        {formatAmount(row.ytd ?? 0)}
                      </Text>
                    </View>
                  ))}
              </View>

              <View style={stylesSectionTwo.payTable}>
                <View
                  style={[stylesSectionTwo.payRow, stylesSectionTwo.payHeader]}
                >
                  <Text
                    style={[
                      stylesSectionTwo.text,
                      stylesSectionTwo.deductionsColDescription,
                      { fontWeight: "bold" },
                    ]}
                  >
                    DEDUCTIONS
                  </Text>
                  <Text
                    style={[
                      stylesSectionTwo.text,
                      stylesSectionTwo.deductionsColAmount,
                      { fontWeight: "bold" },
                    ]}
                  >
                    Current
                  </Text>
                  <Text
                    style={[
                      stylesSectionTwo.text,
                      stylesSectionTwo.deductionsColYtd,
                      { fontWeight: "bold" },
                    ]}
                  >
                    YTD
                  </Text>
                </View>

                {placeholderDeductionKeys.map((placeholderKey) => (
                  <View key={placeholderKey} style={stylesSectionTwo.payRow}>
                    <Text
                      style={[
                        stylesSectionTwo.text,
                        stylesSectionTwo.deductionsColDescription,
                      ]}
                    >
                      {" "}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={{ flexDirection: "column", gap: 20 }}>
              <View style={stylesSectionTwo.bottomSection}>
                <View style={stylesSectionTwo.taxesTable}>
                  <View
                    style={[
                      stylesSectionTwo.taxesRow,
                      stylesSectionTwo.payHeader,
                    ]}
                  >
                    <Text
                      style={[
                        stylesSectionTwo.text,
                        stylesSectionTwo.taxesColDescription,
                        { fontWeight: "bold" },
                      ]}
                    >
                      TAXES
                    </Text>
                    <Text
                      style={[
                        stylesSectionTwo.text,
                        stylesSectionTwo.taxesColAmount,
                        { fontWeight: "bold" },
                      ]}
                    >
                      Current
                    </Text>
                    <Text
                      style={[
                        stylesSectionTwo.text,
                        stylesSectionTwo.taxesColAmount,
                        { fontWeight: "bold" },
                      ]}
                    >
                      YTD
                    </Text>
                  </View>
                  {taxesRows.map((row) => (
                    <View key={row.label} style={stylesSectionTwo.taxesRow}>
                      <Text
                        style={[
                          stylesSectionTwo.text,
                          stylesSectionTwo.taxesColDescription,
                        ]}
                      >
                        {row.label}
                      </Text>
                      <Text
                        style={[
                          stylesSectionTwo.text,
                          stylesSectionTwo.taxesColAmount,
                        ]}
                      >
                        {formatAmount(row.current ?? 0)}
                      </Text>
                      <Text
                        style={[
                          stylesSectionTwo.text,
                          stylesSectionTwo.taxesColAmount,
                        ]}
                      >
                        {formatAmount(row.ytd ?? 0)}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={stylesSectionTwo.summaryTable}>
                  <View
                    style={[
                      stylesSectionTwo.summaryRow,
                      stylesSectionTwo.summaryHeader,
                    ]}
                  >
                    <Text
                      style={[
                        stylesSectionTwo.text,
                        stylesSectionTwo.summaryColDescription,
                        { fontWeight: "bold" },
                      ]}
                    >
                      SUMMARY
                    </Text>
                    <Text
                      style={[
                        stylesSectionTwo.text,
                        stylesSectionTwo.summaryColAmount,
                        { fontWeight: "bold" },
                      ]}
                    >
                      Current
                    </Text>
                    <Text
                      style={[
                        stylesSectionTwo.text,
                        stylesSectionTwo.summaryColAmount,
                        { fontWeight: "bold" },
                      ]}
                    >
                      YTD
                    </Text>
                  </View>
                  {summaryRows.map((row) => (
                    <View key={row.label} style={[stylesSectionTwo.summaryRow]}>
                      <Text
                        style={[
                          stylesSectionTwo.text,
                          stylesSectionTwo.summaryColDescription,
                        ]}
                      >
                        {row.label}
                      </Text>
                      <Text
                        style={[
                          stylesSectionTwo.text,
                          stylesSectionTwo.summaryColAmount,
                        ]}
                      >
                        {formatAmount(row.current ?? 0, "currency")}
                      </Text>
                      <Text
                        style={[
                          stylesSectionTwo.text,
                          stylesSectionTwo.summaryColAmount,
                        ]}
                      >
                        {formatAmount(row.ytd ?? 0, "currency")}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={stylesSectionTwo.netPayRow}>
                <Text style={[{ fontWeight: "bold", fontSize: 11 }]}>
                  Net Pay
                </Text>
                <Text style={[{ fontWeight: "bold", fontSize: 11 }]}>
                  {formatAmount(data.netPay ?? 0, "currency")}
                </Text>
              </View>
            </View>
          </View>
        </Page>
      </Document>
    </PDFViewer>
  )
}
