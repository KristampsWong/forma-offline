import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"

import { auth } from "@/lib/auth/auth"
import { security } from "@/lib/config"
import { logger } from "@/lib/logger"
import { redis } from "@/lib/services/redis"
import { magicLinkRequestSchema } from "@/lib/validation/user-schema"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = magicLinkRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid email format" },
        { status: 400 }
      )
    }

    const { email } = validation.data

    // Generate device session ID for device tracking
    const deviceSessionId = crypto.randomBytes(32).toString("hex")

    // Store device session in Redis (5-min TTL to match magic link)
    await redis.set(
      `magic:device:${deviceSessionId}`,
      JSON.stringify({
        email,
        createdAt: Date.now(),
        ip: request.headers.get("x-forwarded-for") ?? "anonymous",
      }),
      { ex: 300 }
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
      return NextResponse.json(
        { error: "Failed to send magic link" },
        { status: 500 }
      )
    }

    // Create response with HTTP-only cookie for device tracking
    const response = NextResponse.json({ success: true })

    response.cookies.set("device_session", deviceSessionId, {
      httpOnly: true,
      secure: security.secureCookies,
      sameSite: "lax",
      maxAge: 300,
      path: "/",
    })

    logger.info(
      `Device session created for ${email}: ${deviceSessionId.substring(0, 8)}...`
    )

    return response
  } catch (error) {
    logger.error("[request-magic-link] Error:", error)
    return NextResponse.json(
      { error: "Failed to process magic link request" },
      { status: 500 }
    )
  }
}
