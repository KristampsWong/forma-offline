import { NextRequest } from "next/server"

import {
  createErrorResponse,
  createRateLimitResponse,
  createSuccessResponse,
  getClientIp,
} from "@/lib/auth/api-utils"
import { features } from "@/lib/config"
import { logger } from "@/lib/logger"
import { verifyCodeRatelimit } from "@/lib/services/ratelimit"
import { redis } from "@/lib/services/redis"

export async function POST(request : NextRequest) {
  try {
    const { code, email } = await request.json()

    // 1. Validate required fields
    if (!code || !email) {
      return createErrorResponse("Code and email are required")
    }

    // 2. Rate limiting - Prevent brute force attacks (stricter for actual auth)
    // Skip rate limiting in test mode
    if (!features.skipRateLimitInTest) {
      const ip = getClientIp(request)
      const { success, limit, remaining, reset } = await verifyCodeRatelimit.limit(ip)

      if (!success) {
        return createRateLimitResponse(limit, remaining, reset)
      }
    }

    // 3. Get the token associated with this verification code
    const token = await redis.get(`magic:code:${code}`)

    if (!token) {
      return createErrorResponse("Invalid or expired verification code")
    }

    // Convert to string in case Redis returns other types
    const tokenString = String(token)

    // Verify the email matches
    const storedEmail = await redis.get(`magic:email:${tokenString}`)
    const storedEmailString = storedEmail ? String(storedEmail) : null

    if (storedEmailString !== email) {
      return createErrorResponse("Email does not match")
    }

    // Delete all magic link keys immediately after successful verification
    // This prevents the same code/token from being used again
    await Promise.all([
      redis.del(`magic:token:${tokenString}`),
      redis.del(`magic:code:${code}`),
      redis.del(`magic:email:${tokenString}`),
    ])

    // Return the token so client can redirect to Better Auth's verify endpoint
    // This ensures Better Auth handles session creation and cookie setting properly
    return createSuccessResponse({
      success: true,
      token: tokenString,
      verifyUrl: `/api/auth/magic-link/verify?token=${tokenString}&callbackURL=/`,
    })
  } catch (error) {
    logger.error("Error verifying magic code:", error)
    return createErrorResponse("Failed to verify code", 500)
  }
}
