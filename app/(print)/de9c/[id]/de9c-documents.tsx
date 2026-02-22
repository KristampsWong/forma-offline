"use client"

import { Document, Page, Text, View } from "@react-pdf/renderer"
import dynamic from "next/dynamic"
import { formatAmount } from "@/lib/utils"

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => <p>Loading...</p>,
  },
)

type HeaderData = {
  quarterEnded: string[]
  due: string[]
  delinquent: string[]
  year: string
  quarter: string
}

type CompanyInfo = {
  name: string
  address1: string
  address2: string
  employerAccountNumber: string
}

export type EmployeeRow = {
  ssn: string
  firstName: string
  mi?: string
  lastName: string
  totalSubjectWages: string
  totalPitWages: string
  totalPitWithheld: string
  wageCode: string
}

const EMPLOYEES_PER_PAGE = 20

function Banner() {
  return (
    <Text
      style={{
        textAlign: "center",
        fontWeight: "bold",
        fontSize: 12,
        marginTop: 8,
      }}
    >
      KEEP FOR YOUR RECORDS - DO NOT MAIL!
    </Text>
  )
}

function Checkbox() {
  return (
    <View
      style={{
        width: 10,
        height: 10,
        borderWidth: 1,
        borderColor: "black",
      }}
    />
  )
}

const computeTotals = (rows: EmployeeRow[]) => {
  const toNum = (value: string) => Number(String(value).replace(/,/g, "")) || 0

  const totalFor = (getter: (row: EmployeeRow) => string) =>
    formatAmount(String(rows.reduce((sum, row) => sum + toNum(getter(row)), 0)))

  return {
    subject: totalFor((row) => row.totalSubjectWages),
    pitWages: totalFor((row) => row.totalPitWages),
    pitWithheld: totalFor((row) => row.totalPitWithheld),
  }
}

/**
 * Simulated table using flex rows/cols since react-pdf
 * doesn't support HTML <table>.
 */
function EmployeeTable({ rows }: { rows: EmployeeRow[] }) {
  // column flex ratios (roughly match your table widths)
  const colStyles = [
    { flex: 1.4 }, // SSN
    { flex: 1.2 }, // First name
    { flex: 0.6 }, // MI
    { flex: 1.3 }, // Last name
    { flex: 1.2 }, // G
    { flex: 1.2 }, // H
    { flex: 1.2 }, // I
    { flex: 0.8 }, // Wage code
  ]

  const baseCell = {
    borderRightWidth: 1,
    borderColor: "black",
    paddingHorizontal: 4,
    paddingVertical: 3,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  }

  const numberText = {
    fontFamily: "Courier",
  }

  const nameText = {
    fontFamily: "Courier",
  }

  return (
    <View
      style={{
        borderColor: "black",
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        fontSize: 9,
        marginTop: 8,
      }}
    >
      {/* Header row */}
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: 1,
          borderColor: "black",
        }}
      >
        <View style={{ ...colStyles[0], ...baseCell }}>
          <Text>E. SSN</Text>
        </View>
        <View style={{ ...colStyles[1], ...baseCell }}>
          <Text>F. First Name</Text>
        </View>
        <View style={{ ...colStyles[2], ...baseCell }}>
          <Text>MI</Text>
        </View>
        <View style={{ ...colStyles[3], ...baseCell }}>
          <Text>Last Name</Text>
        </View>
        <View style={{ ...colStyles[4], ...baseCell }}>
          <Text>G. Total Subject</Text>
          <Text>Wages</Text>
        </View>
        <View style={{ ...colStyles[5], ...baseCell }}>
          <Text>H. Total PIT</Text>
          <Text>Wages</Text>
        </View>
        <View style={{ ...colStyles[6], ...baseCell }}>
          <Text>I. Total PIT</Text>
          <Text>Withheld</Text>
        </View>
        <View style={{ ...colStyles[7], ...baseCell, borderRightWidth: 0 }}>
          <Text>Wage</Text>
          <Text>Code</Text>
        </View>
      </View>

      {/* Body rows */}
      {rows.map((employee) => (
        <View
          key={employee.ssn}
          style={{
            flexDirection: "row",
            borderBottomWidth: 1,
            borderColor: "black",
          }}
        >
          <View style={{ ...colStyles[0], ...baseCell }}>
            <Text style={numberText}>{employee.ssn}</Text>
          </View>
          <View style={{ ...colStyles[1], ...baseCell }}>
            <Text style={nameText}>{employee.firstName}</Text>
          </View>
          <View style={{ ...colStyles[2], ...baseCell }}>
            <Text style={nameText}>{employee.mi || ""}</Text>
          </View>
          <View style={{ ...colStyles[3], ...baseCell }}>
            <Text style={nameText}>{employee.lastName}</Text>
          </View>
          <View style={{ ...colStyles[4], ...baseCell }}>
            <Text style={numberText}>
              {formatAmount(employee.totalSubjectWages)}
            </Text>
          </View>
          <View style={{ ...colStyles[5], ...baseCell }}>
            <Text style={numberText}>
              {formatAmount(employee.totalPitWages)}
            </Text>
          </View>
          <View style={{ ...colStyles[6], ...baseCell }}>
            <Text style={numberText}>
              {formatAmount(employee.totalPitWithheld)}
            </Text>
          </View>
          <View style={{ ...colStyles[7], ...baseCell, borderRightWidth: 0 }}>
            <Text style={numberText}>{employee.wageCode}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

function GrandTotals({
  subject,
  pitWages,
  pitWithheld,
}: {
  subject: string
  pitWages: string
  pitWithheld: string
}) {
  const labels = [
    "M. Grand Total Subject Wages",
    "N. Grand Total PIT Wages",
    "O. Grand Total PIT Withheld",
  ]
  const values = [subject, pitWages, pitWithheld]

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 16,
      }}
    >
      {labels.map((label, idx) => (
        <View
          key={label}
          style={{
            alignItems: "center",
            flex: 1,
          }}
        >
          <Text
            style={{
              fontSize: 9,
              marginBottom: 4,
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            {label}
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: "black",
              minWidth: 160,
              paddingVertical: 4,
              paddingHorizontal: 6,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: 10,
                textAlign: "center",
                fontFamily: "Courier",
              }}
            >
              {values[idx]}
            </Text>
          </View>
        </View>
      ))}
    </View>
  )
}

export default function De9cDocuments({
  headerData,
  companyInfo,
  employees,
}: {
  headerData: HeaderData
  companyInfo: CompanyInfo
  employees: EmployeeRow[]
}) {
  const totals = computeTotals(employees)
  const totalPages = Math.max(
    1,
    Math.ceil(employees.length / EMPLOYEES_PER_PAGE),
  )
  const currentPage = 1 // single-page version for now

  return (
    <PDFViewer style={{ width: "100%", height: "100vh" }}>
      <Document>
        <Page
          size="LETTER"
          style={{
            padding: 32,
            fontFamily: "Helvetica",
            fontSize: 10,
          }}
        >
          {/* Header */}
          <View style={{ textAlign: "center", marginBottom: 8 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "bold",
                letterSpacing: 1,
              }}
            >
              QUARTERLY CONTRIBUTION
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "bold",
                letterSpacing: 1,
              }}
            >
              RETURN AND REPORT OF WAGES
            </Text>
          </View>

          {/* Page number row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 8, fontWeight: "bold" }}>Page number</Text>
            <View
              style={{
                borderBottomWidth: 1,
                borderColor: "black",
                marginHorizontal: 6,
                paddingHorizontal: 8,
              }}
            >
              <Text style={{ fontSize: 10 }}>{currentPage}</Text>
            </View>
            <Text style={{ fontSize: 8, fontWeight: "bold" }}>of</Text>
            <View
              style={{
                borderBottomWidth: 1,
                borderColor: "black",
                marginLeft: 6,
                paddingHorizontal: 8,
              }}
            >
              <Text style={{ fontSize: 10 }}>{totalPages}</Text>
            </View>
          </View>

          {/* Date Info Row */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            {/* Quarter Ended */}
            <View
              style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}
            >
              <View style={{ fontSize: 6 }}>
                <Text>QUARTER</Text>
                <Text>ENDED</Text>
              </View>
              <Text style={{ fontSize: 10, letterSpacing: 2, color: "#666" }}>
                {headerData.quarterEnded.join("  ")}
              </Text>
            </View>

            {/* Due */}
            <View
              style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}
            >
              <Text style={{ fontSize: 6 }}>DUE</Text>
              <Text style={{ fontSize: 10, letterSpacing: 2, color: "#666" }}>
                {headerData.due.join("  ")}
              </Text>
            </View>

            {/* Delinquent */}
            <View
              style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}
            >
              <View style={{ fontSize: 6, textAlign: "right" }}>
                <Text>DELINQUENT IF</Text>
                <Text>NOT POSTMARKED</Text>
                <Text>OR RECEIVED BY</Text>
              </View>
              <Text style={{ fontSize: 10, letterSpacing: 2, color: "#666" }}>
                {headerData.delinquent.join("  ")}
              </Text>
            </View>

            {/* Year QTR */}
            <View style={{ alignItems: "flex-end" }}>
              <View style={{ flexDirection: "row", gap: 12, fontSize: 6 }}>
                <Text>YR</Text>
                <Text>QTR</Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  gap: 16,
                  fontSize: 10,
                  letterSpacing: 2,
                  color: "#666",
                }}
              >
                <Text>{headerData.year}</Text>
                <Text>{headerData.quarter}</Text>
              </View>
            </View>
          </View>
          {/* Company Info Section */}
          <View style={{ marginTop: 32 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              {/* Company Address */}
              <View
                style={{
                  fontFamily: "Courier",
                  fontSize: 10,
                  letterSpacing: 1,
                }}
              >
                <Text>{companyInfo.name}</Text>
                <Text>{companyInfo.address1}</Text>
                <Text>{companyInfo.address2}</Text>
              </View>

              {/* Employer Account Number */}
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 6, color: "#666", marginBottom: 4 }}>
                  EMPLOYER ACCOUNT NUMBER
                </Text>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: "black",
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    minWidth: 140,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Courier",
                      fontSize: 12,
                      textAlign: "center",
                      letterSpacing: 1,
                    }}
                  >
                    {companyInfo.employerAccountNumber}
                  </Text>
                </View>
              </View>
            </View>
            <View style={{ marginTop: 32 }}></View>

            {/* Banner */}
            <Banner />

            {/* Section A */}
            <View style={{ marginTop: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  marginBottom: 4,
                }}
              >
                <View
                  style={{
                    width: 260,
                    fontSize: 8,
                    lineHeight: 1.2,
                  }}
                >
                  <Text>
                    A. <Text style={{ fontWeight: "bold" }}>EMPLOYEES</Text>{" "}
                    full-time and part-time who worked during or received pay
                    subject to UI for the payroll period{" "}
                    <Text style={{ fontWeight: "bold" }}>which includes</Text>{" "}
                    the 12th of the month.
                  </Text>
                </View>
              </View>

              <View
                style={{
                  width: 260,
                  alignSelf: "flex-end",
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                {[
                  { label: "1st Mo.", value: "1" },
                  { label: "2nd Mo.", value: "1" },
                  { label: "3rd Mo.", value: "1" },
                ].map(({ label, value }) => (
                  <View key={label} style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 8, marginBottom: 4 }}>
                      {label}
                    </Text>
                    <Text style={{ fontSize: 10 }}>{value}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Sections B, C, D */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 10,
              }}
            >
              {/* B */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  flex: 1,
                  marginRight: 12,
                }}
              >
                <Text style={{ marginRight: 4 }}>B.</Text>
                <Checkbox />
                <View
                  style={{
                    fontSize: 8,
                    marginLeft: 4,
                    lineHeight: 1.2,
                    textAlign: "justify",
                    flex: 1,
                  }}
                >
                  <Text>
                    Check this box if you are reporting ONLY Voluntary Plan
                    Disability Insurance wages on this page. Report Personal
                    Income Tax (PIT) Wages and PIT Withheld, if appropriate.
                  </Text>
                  <Text> (See instructions for Item B.)</Text>
                </View>
              </View>

              {/* C */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                <Text style={{ marginRight: 4 }}>C.</Text>
                <Checkbox />
                <Text style={{ fontSize: 10, marginLeft: 4 }}>No Payroll</Text>
              </View>

              {/* D */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Text style={{ marginRight: 4 }}>D.</Text>
                <Checkbox />
                <Text style={{ fontSize: 10, marginLeft: 4 }}>
                  Out of Business
                </Text>
              </View>
            </View>

            {/* Employee table */}
            <EmployeeTable rows={employees} />

            {/* Grand totals */}
            <GrandTotals
              subject={totals.subject}
              pitWages={totals.pitWages}
              pitWithheld={totals.pitWithheld}
            />

            {/* Final banner */}
            <Banner />
          </View>
        </Page>
      </Document>
    </PDFViewer>
  )
}
