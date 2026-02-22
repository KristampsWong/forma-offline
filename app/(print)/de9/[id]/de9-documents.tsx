"use client"
import { Document, Page, Text, View } from "@react-pdf/renderer"
import dynamic from "next/dynamic"

/**
 * Format a Date object to string array [MM, DD, YYYY] for PDF display
 */
function formatDateToArray(date: Date): string[] {
  return [
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
    String(date.getUTCFullYear()),
  ]
}

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => <p>Loading...</p>,
  },
)

function AmountBox({
  value,
  title,
  width,
}: {
  value: string
  title?: string
  width?: number
}) {
  return (
    <View style={{ position: "relative" }}>
      {title && (
        <Text
          style={{
            position: "absolute",
            left: 0,
            top: -12,
            fontSize: 6,
          }}
        >
          {title}
        </Text>
      )}
      <View
        style={{
          borderWidth: 1,
          borderColor: "rgba(0, 0, 0, 0)",
          paddingHorizontal: 6,
          paddingVertical: 2,
          width: width || "auto",
        }}
      >
        <Text
          style={{
            fontFamily: "Courier",
            fontSize: 10,
            color: "rgba(0,0,0,0.6)",
            textAlign: "right",
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  )
}

function Checkbox() {
  return (
    <View
      style={{
        width: 10,
        height: 10,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.3)",
      }}
    />
  )
}

function Title({
  title,
  indicator,
  dotLeader = true,
}: {
  title: string
  indicator: string
  dotLeader?: boolean
}) {
  return (
    <View
      style={{
        fontSize: 9,
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 4,
        flex: 1,
      }}
    >
      <Text style={{ fontWeight: "bold" }}>{indicator}.</Text>
      <Text>{title}</Text>
      {dotLeader && (
        <View
          style={{
            flex: 1,
            borderBottomWidth: 1,
            borderBottomColor: "black",
            borderStyle: "dotted",
            marginRight: 4,
            marginBottom: 2,
          }}
        />
      )}
    </View>
  )
}

export function DoubleLine() {
  return (
    <View style={{ marginVertical: 8 }}>
      <View
        style={{
          borderBottomWidth: 1,
          borderBottomColor: "black",
          marginBottom: 1,
        }}
      />
      <View style={{ borderBottomWidth: 1, borderBottomColor: "black" }} />
    </View>
  )
}

function Banner() {
  return (
    <Text
      style={{
        textAlign: "center",
        fontWeight: "bold",
        fontSize: 12,
      }}
    >
      KEEP FOR YOUR RECORDS - DO NOT MAIL!
    </Text>
  )
}

export default function De9Documents({
  headerData,
  companyInfo,
  formData,
}: {
  headerData: {
    quarterEnded: Date
    due: Date
    delinquent: Date
    year: string
    quarter: string
  }
  companyInfo: {
    name: string
    address1: string
    address2: string
    employerAccountNumber: string
  }
  formData: {
    fein: string
    additionalFeins: string[]
    uiRate: string
    uiTaxable: string
    uiContrib: string
    ettRate: string
    ettContrib: string
    sdiRate: string
    sdiTaxable: string
    sdiContrib: string
    subjectWages: string
    pitWithheld: string
    subtotal: string
    contributionsPaid: string
    totalDue: string
    outBusinessDate: string
  }
}) {
  // Convert Date objects to string arrays for PDF display
  const quarterEndedArr = formatDateToArray(headerData.quarterEnded)
  const dueArr = formatDateToArray(headerData.due)
  const delinquentArr = formatDateToArray(headerData.delinquent)
  return (
    <PDFViewer style={{ width: "100%", height: "100vh" }}>
      <Document>
        <Page
          size="LETTER"
          style={{ padding: 32, fontFamily: "Helvetica", fontSize: 10 }}
        >
          {/* Header */}
          <View style={{ textAlign: "center" }}>
            <Text
              style={{ fontSize: 11, fontWeight: "bold", letterSpacing: 1 }}
            >
              QUARTERLY CONTRIBUTION
            </Text>
            <Text
              style={{ fontSize: 11, fontWeight: "bold", letterSpacing: 1 }}
            >
              RETURN AND REPORT OF WAGES
            </Text>
          </View>

          <DoubleLine />

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
                {quarterEndedArr.join("  ")}
              </Text>
            </View>

            {/* Due */}
            <View
              style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}
            >
              <Text style={{ fontSize: 6 }}>DUE</Text>
              <Text style={{ fontSize: 10, letterSpacing: 2, color: "#666" }}>
                {dueArr.join("  ")}
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
                {delinquentArr.join("  ")}
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
            <View style={{ marginTop: 32 }}>
              <Banner />
              <DoubleLine />
            </View>
          </View>

          {/* FEIN Row */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Text style={{ fontSize: 9 }}>FEIN</Text>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: "rgba(0,0,0,0)",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  minWidth: 80,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Courier",
                    fontSize: 10,
                    color: "rgba(0,0,0,0.6)",
                    textAlign: "center",
                  }}
                >
                  {formData.fein}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 16 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Checkbox />
                <Text style={{ fontSize: 8 }}>
                  A. NO WAGES PAID THIS QUARTER
                </Text>
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Checkbox />
                <Text style={{ fontSize: 8 }}>
                  B. OUT OF BUSINESS/NO EMPLOYEES
                </Text>
              </View>
            </View>
          </View>

          {/* Additional FEINs Row */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <View
              style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
            >
              <Text style={{ fontSize: 8, lineHeight: 1.2 }}>
                ADDITIONAL{"\n"}FEINS
              </Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {formData.additionalFeins.map((value, index) => (
                  <View
                    // biome-ignore lint/suspicious/noArrayIndexKey: Static array with fixed 2 slots
                    key={index}
                    style={{
                      borderWidth: 1,
                      borderColor: "rgba(0,0,0,0)",
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      minWidth: 100,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Courier",
                        fontSize: 10,
                        color: "rgba(0,0,0,0.6)",
                        textAlign: "center",
                      }}
                    >
                      {value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: "bold" }}>B1.</Text>
                <Text style={{ fontSize: 7 }}>OUT OF BUSINESS DATE</Text>
              </View>
              <View
                style={{
                  borderWidth: 2,
                  borderColor: "black",
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  minWidth: 120,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Courier",
                    fontSize: 8,
                    textAlign: "center",
                  }}
                >
                  {formData.outBusinessDate}
                </Text>
              </View>
            </View>
          </View>

          {/* Form Fields Section */}
          <View style={{ marginTop: 16, flexDirection: "column", gap: 16 }}>
            {/* C. Total Subject Wages */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Title
                title="TOTAL SUBJECT WAGES PAID THIS QUARTER"
                indicator="C"
              />
              <AmountBox value={formData.subjectWages} width={156} />
            </View>

            {/* D. Unemployment Insurance */}
            <View style={{ marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  gap: 4,
                  fontSize: 9,
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontWeight: "bold" }}>D.</Text>
                <Text>
                  UNEMPLOYMENT INSURANCE (UI) (Total Employee Wages up to{" "}
                </Text>
                <Text style={{ fontWeight: "bold" }}>$7,000 </Text>
                <Text>per employee per calendar year)</Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                }}
              >
                <AmountBox
                  value={formData.uiRate}
                  title="(D1) UI Rate %"
                  width={60}
                />
                <Text style={{ fontSize: 9 }}>TIMES</Text>
                <AmountBox
                  value={formData.uiTaxable}
                  title="(D2) UI TAXABLE WAGES FOR THE QUARTER"
                  width={156}
                />
                <Text style={{ fontSize: 9 }}>=</Text>
                <AmountBox
                  value={formData.uiContrib}
                  title="(D3) UI CONTRIBUTIONS"
                  width={156}
                />
              </View>
            </View>

            {/* E. Employment Training Tax */}
            <View>
              <Title
                title="EMPLOYMENT TRAINING TAX (ETT)"
                indicator="E"
                dotLeader={false}
              />
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  marginTop: 12,
                  marginBottom: 16,
                }}
              >
                <AmountBox
                  value={formData.ettRate}
                  title="(E1) ETT Rate %"
                  width={60}
                />
                <Text style={{ fontSize: 9 }}>TIMES</Text>
                <Text style={{ fontSize: 9, width: 156 }}>
                  UI Taxable Wages for the Quarter (D2)
                </Text>
                <Text style={{ fontSize: 9 }}>=</Text>
                <AmountBox
                  value={formData.ettContrib}
                  title="(E2) ETT CONTRIBUTIONS"
                  width={156}
                />
              </View>
            </View>

            <Banner />

            {/* F. State Disability Insurance */}
            <View>
              <View
                style={{
                  flexDirection: "row",
                  gap: 4,
                  fontSize: 9,
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontWeight: "bold" }}>F.</Text>
                <Text>
                  STATE DISABILITY INSURANCE (SDI) (Total Employee Wages up to $
                  per employee per calendar year)
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                }}
              >
                <AmountBox
                  value={formData.sdiRate}
                  title="(F1) SDI Rate %"
                  width={60}
                />
                <Text style={{ fontSize: 9 }}>TIMES</Text>
                <AmountBox
                  value={formData.sdiTaxable}
                  title="(F2) SDI TAXABLE WAGES FOR THE QUARTER"
                  width={156}
                />
                <Text style={{ fontSize: 9 }}>=</Text>
                <AmountBox
                  value={formData.sdiContrib}
                  title="(F3) SDI EMPLOYEE CONTRIBUTIONS WITHHELD"
                  width={156}
                />
              </View>
            </View>

            {/* G. PIT Withheld */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                justifyContent: "space-between",
              }}
            >
              <Title
                title="CALIFORNIA PERSONAL INCOME TAX (PIT) WITHHELD"
                indicator="G"
              />
              <AmountBox value={formData.pitWithheld} width={156} />
            </View>

            {/* H. Subtotal */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                justifyContent: "space-between",
              }}
            >
              <Title
                title="(Add Items D3, E2, F3, and G)"
                indicator="H. SUBTOTAL"
              />
              <AmountBox value={formData.subtotal} width={156} />
            </View>

            {/* I. Less Contributions */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1, position: "relative" }}>
                <Title
                  title="LESS CONTRIBUTIONS PAID THIS QUARTER"
                  indicator="I"
                />
                <Text
                  style={{
                    fontSize: 9,
                    marginLeft: 32,
                    position: "absolute",
                    top: 0,
                  }}
                >
                  (<Text style={{ fontWeight: "bold" }}>DO NOT </Text>INCLUDE
                  PENALTY AND INTEREST PAYMENTS)
                </Text>
              </View>
              <AmountBox value={formData.contributionsPaid} width={156} />
            </View>

            {/* J. Total Due */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Title
                title="TOTAL TAXES DUE OR OVERPAID (Item H minus Item I)"
                indicator="J"
              />
              <AmountBox value={formData.totalDue} width={156} />
            </View>
          </View>

          {/* Final Banner */}
          <Banner />
        </Page>
      </Document>
    </PDFViewer>
  )
}
