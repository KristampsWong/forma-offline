"use server"

import { withAuth } from "@/lib/auth/auth-helpers"
import { getDe9cByIdCore } from "@/lib/services/tax/de9c"

export async function getDe9cById(de9cId: string) {
  return withAuth((userId) => getDe9cByIdCore(userId, de9cId))
}
