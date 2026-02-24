import {
  createErrorResponse,
  createSuccessResponse,
} from "@/lib/auth/api-utils"
import { getCurrentUser } from "@/lib/auth/auth-helpers"
import { logger } from "@/lib/logger"

/**
 * Example API route to get current user
 * GET /api/user
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return createErrorResponse("Not authenticated", 401)
    }

    return createSuccessResponse({
      // Better Auth session data
      session: currentUser.session,
      // Your Mongoose user data with companyId, etc.
      user: currentUser.user,
    })
  } catch (error) {
    logger.error("Error fetching user:", error)
    return createErrorResponse("Internal server error", 500)
  }
}
