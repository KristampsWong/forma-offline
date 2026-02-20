"use server"

import { requireAuth } from "@/lib/auth/auth-helpers"
import { COMPANY_ERRORS, STATE_RATE_ERRORS } from "@/lib/constants/errors"
import dbConnect from "@/lib/db/dbConnect"
import { logger } from "@/lib/logger"
import {
  createCompanyInputSchema,
  type StateRateFormValues,
  type UpdateCompanyFormValues,
  updateCompanySchema,
  stateRateSchema,
} from "@/lib/validation/company-schema"
import Company, { type ICompany } from "@/models/company"
import type { LeanDoc } from "@/types/db"

export async function checkNeedsOnboarding(): Promise<string | null> {
  const { user } = await requireAuth()

  await dbConnect()

  const company = await Company.findOne({
    userId: user.id,
  })
    .select("_id")
    .lean()

  return company?._id.toString() ?? null
}

export async function createCompany(
  input: {
    name: string
    ein: string
    address: {
      line1: string
      line2?: string
      city: string
      state: string
      zip: string
    }
    payFrequency: "monthly"
  }
): Promise<{ success: true } | { success: false; error: string }> {
  const { user } = await requireAuth()

  const parsed = createCompanyInputSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid input",
    }
  }

  await dbConnect()

  // Check if user already has a company
  const existing = await Company.findOne({ userId: user.id })
    .select("_id")
    .lean()

  if (existing) {
    return { success: false, error: "Company already exists" }
  }

  await Company.create({
    userId: user.id,
    name: parsed.data.name,
    ein: parsed.data.ein,
    address: parsed.data.address,
    payFrequency: parsed.data.payFrequency,
  })

  return { success: true }
}


export async function getCompany() {
  const { user } = await requireAuth()

  await dbConnect()

  const company = await Company.findOne({ userId: user.id }).lean<
    LeanDoc<ICompany>
  >()

  if (!company) return null

  // Serialize to plain object for client components
  // (strips ObjectId/Date wrappers that can't cross the server→client boundary)
  return JSON.parse(JSON.stringify(company)) as LeanDoc<ICompany>
}

export async function updateCompany(
  input: UpdateCompanyFormValues
): Promise<{ success: true } | { success: false; error: string }> {
  const { user } = await requireAuth()

  const parsed = updateCompanySchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid input",
    }
  }

  await dbConnect()

  const company = await Company.findOne({ userId: user.id })
  if (!company) {
    return { success: false, error: COMPANY_ERRORS.NOT_FOUND }
  }

  company.name = parsed.data.name
  company.address = {
    line1: parsed.data.address,
    line2: parsed.data.line2,
    city: parsed.data.city,
    state: parsed.data.state,
    zip: parsed.data.zip,
  }
  company.payFrequency = parsed.data.payFrequency

  try {
    await company.save()
    return { success: true }
  } catch (error) {
    logger.error("Failed to update company:", error)
    return { success: false, error: COMPANY_ERRORS.FAILED_TO_UPDATE }
  }
}

export async function updateCompanyStateRate(
  input: StateRateFormValues
): Promise<{ success: true } | { success: false; error: string }> {
  const { user } = await requireAuth()

  const parsed = stateRateSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid input",
    }
  }

  // Parse effective date and check it's not in the future
  const [month, day, year] = parsed.data.effectiveDate.split("/").map(Number)
  const effectiveDate = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (effectiveDate > today) {
    return { success: false, error: STATE_RATE_ERRORS.FUTURE_DATE }
  }

  await dbConnect()

  const company = await Company.findOne({ userId: user.id })
  if (!company) {
    return { success: false, error: COMPANY_ERRORS.NOT_FOUND }
  }

  const newRate = {
    state: "CA",
    UIRate: parseFloat(parsed.data.uiRate) / 100,
    ETTRate: parseFloat(parsed.data.ettRate) / 100,
    eddAccountNumber: parsed.data.eddAccountNumber,
    effectiveDate,
  }

  // Push current rate to history before updating
  if (company.currentStateRate) {
    company.stateRatesHistory.push(company.currentStateRate)
  }
  company.currentStateRate = newRate

  try {
    await company.save()
    return { success: true }
  } catch (error) {
    logger.error("Failed to update state rates:", error)
    return { success: false, error: COMPANY_ERRORS.FAILED_TO_UPDATE_RATES }
  }
}