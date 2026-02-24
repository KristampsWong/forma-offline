import { NextRequest, NextResponse } from "next/server"

import { logger } from "@/lib/logger"
import { redis } from "@/lib/services/redis"

export async function POST(request : NextRequest) {
  try {
    const { code, email } = await request.json()

    if (!code || !email) {
      return NextResponse.json(
        { error: "Code and email are required" },
        { status: 400 }
      )
    }

    const token = await redis.get(`magic:code:${code}`)

    if (!token) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 }
      )
    }

    const tokenString = String(token)

    // Verify the email matches
    const storedEmail = await redis.get(`magic:email:${tokenString}`)

    if (String(storedEmail) !== email) {
      return NextResponse.json(
        { error: "Email does not match" },
        { status: 400 }
      )
    }

    // Delete all magic link keys immediately after successful verification
    await Promise.all([
      redis.del(`magic:token:${tokenString}`),
      redis.del(`magic:code:${code}`),
      redis.del(`magic:email:${tokenString}`),
    ])

    return NextResponse.json({
      success: true,
      token: tokenString,
      verifyUrl: `/api/auth/magic-link/verify?token=${tokenString}&callbackURL=/`,
    })
  } catch (error) {
    logger.error("Error verifying magic code:", error)
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    )
  }
}
