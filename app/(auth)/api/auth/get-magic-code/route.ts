import { NextRequest } from "next/server"

import {
  createErrorResponse,
  createRateLimitResponse,
  createSuccessResponse,
  getClientIp,
} from "@/lib/auth/api-utils"
import { features } from "@/lib/config"
import { logger } from "@/lib/logger"
import { magicCodeRatelimit } from "@/lib/services/ratelimit"
import { redis } from "@/lib/services/redis"

export async function POST(request : NextRequest) {
  try {
    const { token } = await request.json()

    // 1. Validate required fields
    if (!token) {
      return createErrorResponse("Token is required", 400, { isExpired: true })
    }

    // 2. Rate limiting - Prevent brute force attacks
    // Skip rate limiting in test mode
    if (!features.skipRateLimitInTest) {
      const ip = getClientIp(request)
      const { success, limit, remaining, reset } = await magicCodeRatelimit.limit(ip)

      if (!success) {
        return createRateLimitResponse(limit, remaining, reset)
      }
    }

    // 3. Get the verification code associated with this token
    const code = await redis.get(`magic:token:${token}`)

    if (!code) {
      return createErrorResponse("Invalid or expired token", 400, { isExpired: true })
    }

    // Convert to string in case Redis returns it as a number
    const codeString = String(code)

    return createSuccessResponse({
      code: codeString,
      isExpired: false,
    })
  } catch (error) {
    logger.error("Error getting magic code:", error)
    return createErrorResponse("Failed to get verification code", 500, { isExpired: true })
  }
}
