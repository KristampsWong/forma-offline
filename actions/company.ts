"use server"

import { requireAuth } from "@/lib/auth/auth-helpers"
import dbConnect from "@/lib/db/dbConnect"
import { createCompanyInputSchema } from "@/lib/validation/company-schema"
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
    payFrequency: "biweekly" | "monthly"
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

  return company ?? null
}