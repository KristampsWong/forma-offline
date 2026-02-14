import { headers } from "next/headers"
import { cache } from "react"

import { auth } from "@/lib/auth/auth"

export interface BetterAuthUser {
  id: string
  email: string
  name: string
  image?: string
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface BetterAuthSession {
  id: string
  userId: string
  expiresAt: Date
  ipAddress?: string
  userAgent?: string
}

export interface AuthResponse {
  session: BetterAuthSession
  user: BetterAuthUser
}

export const AUTH_ERRORS = {
  NOT_AUTHENTICATED: "Unauthorized - Please sign in",
} as const

/**
 * Get the current authenticated user from Better Auth
 * CACHED: Multiple calls within the same request will only fetch once
 */
export const getCurrentUser = cache(
  async (): Promise<AuthResponse | null> => {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return null
    }

    return {
      session: session.session as BetterAuthSession,
      user: session.user as BetterAuthUser,
    }
  }
)

/**
 * Require authentication - throws error if user is not authenticated
 *
 * @throws {Error} If user is not authenticated
 * @returns The authenticated user session and data
 */
export async function requireAuth(): Promise<AuthResponse> {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    throw new Error(AUTH_ERRORS.NOT_AUTHENTICATED)
  }

  return currentUser
}
