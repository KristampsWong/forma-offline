import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"

import { auth } from "@/lib/auth/auth"
import { isBuildTime } from "@/lib/env"
import { logger } from "@/lib/logger"

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
    if (isBuildTime()) return null

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
  if (isBuildTime()) {
    redirect("/sign-in")
  }

  const currentUser = await getCurrentUser()

  if (!currentUser) {
    throw new Error(AUTH_ERRORS.NOT_AUTHENTICATED)
  }

  return currentUser
}

type ActionSuccess<T> = { success: true; data: T }
type ActionError = { success: false; error: string }
type ActionResult<T> = ActionSuccess<T> | ActionError

/**
 * Reusable auth wrapper for server actions.
 * Handles auth check, passes userId to service fn, and standardizes error responses.
 */
export async function withAuth<T>(
  fn: (userId: string) => Promise<T>
): Promise<ActionResult<T>> {
  if (isBuildTime()) {
    return { success: false, error: "Not available during build" }
  }

  const { user } = await requireAuth()

  try {
    const data = await fn(user.id)
    return { success: true, data }
  } catch (error) {
    logger.error(
      "Action error",
      error instanceof Error ? error.message : error,
    )
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    }
  }
}
