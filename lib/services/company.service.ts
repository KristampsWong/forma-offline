import dbConnect from "@/lib/db/dbConnect"
import Company from "@/models/company"
import type { CompanyData } from "@/types/company"

/**
 * Get company data for client components.
 * Maps Mongoose lean doc to a plain serialized object.
 */
export async function getCompanyCore(
  userId: string,
): Promise<CompanyData | null> {
  await dbConnect()

  const company = await Company.findOne({ userId }).lean()

  if (!company) return null

  return {
    _id: company._id.toString(),
    name: company.name,
    ein: company.ein,
    address: {
      line1: company.address.line1,
      line2: company.address.line2,
      city: company.address.city,
      state: company.address.state,
      zip: company.address.zip,
    },
    userId: company.userId,
    currentStateRate: {
      state: company.currentStateRate.state,
      ETTRate: company.currentStateRate.ETTRate,
      UIRate: company.currentStateRate.UIRate,
      eddAccountNumber: company.currentStateRate.eddAccountNumber,
      effectiveDate: company.currentStateRate.effectiveDate.toISOString(),
    },
    stateRatesHistory: company.stateRatesHistory.map((rate) => ({
      state: rate.state,
      ETTRate: rate.ETTRate,
      UIRate: rate.UIRate,
      eddAccountNumber: rate.eddAccountNumber,
      effectiveDate: rate.effectiveDate.toISOString(),
    })),
    companyType: company.companyType,
    payFrequency: company.payFrequency,
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
  }
}
