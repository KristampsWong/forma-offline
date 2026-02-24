import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/auth"
import {
  createErrorResponse,
  createRateLimitResponse,
  getClientIp,
  validateOrigin,
} from "@/lib/auth/api-utils"
import { features, security } from "@/lib/config"
import { logger } from "@/lib/logger"
import { emailRatelimit } from "@/lib/services/ratelimit"
import { redis } from "@/lib/services/redis"
import { magicLinkRequestSchema } from "@/lib/validation/user-schema"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Layer 1: Input Validation (Zod)
    const validation = magicLinkRequestSchema.safeParse(body)
    if (!validation.success) {
      return createErrorResponse(
        validation.error.issues[0]?.message || "Invalid email format",
        400
      )
    }

    const { email } = validation.data

    // Layer 2: Rate Limiting (email-based to prevent enumeration)
    if (!features.skipRateLimitInTest) {
      const { success, limit, remaining, reset } = await emailRatelimit.limit(
        email // Already normalized by Zod (.toLowerCase())
      )

      if (!success) {
        logger.warn(`[Rate Limit] Magic link request blocked for ${email}`)
        return createRateLimitResponse(limit, remaining, reset)
      }
    }

    // Layer 3: Origin Validation (prevent external requests)
    if (!validateOrigin(request)) {
      logger.warn(
        `[Origin Validation] Invalid origin for magic link request: ${
          request.headers.get("origin") || request.headers.get("referer") || "unknown"
        }`
      )
      return createErrorResponse("Invalid origin", 403)
    }

    // Generate device session ID for device tracking
    const deviceSessionId = crypto.randomBytes(32).toString("hex")

    // Store device session in Redis (5-min TTL to match magic link)
    await redis.set(
      `magic:device:${deviceSessionId}`,
      JSON.stringify({
        email,
        createdAt: Date.now(),
        ip: getClientIp(request),
      }),
      { ex: 300 } // 5 minutes
    )

    // Call Better Auth's magic link API using server-side API
    // This triggers the sendMagicLink callback in auth.ts
    const result = await auth.api.signInMagicLink({
      body: {
        email,
        callbackURL: "/",
      },
      headers: request.headers,
    })

    if (!result) {
      return createErrorResponse("Failed to send magic link", 500)
    }

    // Create response with HTTP-only cookie for device tracking
    const response = NextResponse.json({ success: true })

    // Set HTTP-only cookie with device session ID
    response.cookies.set("device_session", deviceSessionId, {
      httpOnly: true,
      secure: security.secureCookies,
      sameSite: "lax",
      maxAge: 300, // 5 minutes (same as magic link TTL)
      path: "/",
    })

    logger.info(
      `Device session created for ${email}: ${deviceSessionId.substring(0, 8)}...`
    )

    return response
  } catch (error) {
    logger.error("[request-magic-link] Error:", error)
    return createErrorResponse("Failed to process magic link request", 500)
  }
}
