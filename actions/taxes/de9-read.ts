"use server"

import { withAuth } from "@/lib/auth/auth-helpers"
import { getDe9ByIdCore } from "@/lib/services/tax/de9"

export async function getDe9ById(de9Id: string) {
  return withAuth((userId) => getDe9ByIdCore(userId, de9Id))
}
