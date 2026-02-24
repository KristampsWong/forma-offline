import { NextRequest, NextResponse } from "next/server"

import { logger } from "@/lib/logger"
import { redis } from "@/lib/services/redis"

export async function POST(request : NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: "Token is required", isExpired: true },
        { status: 400 }
      )
    }

    const code = await redis.get(`magic:token:${token}`)

    if (!code) {
      return NextResponse.json(
        { error: "Invalid or expired token", isExpired: true },
        { status: 400 }
      )
    }

    return NextResponse.json({
      code: String(code),
      isExpired: false,
    })
  } catch (error) {
    logger.error("Error getting magic code:", error)
    return NextResponse.json(
      { error: "Failed to get verification code", isExpired: true },
      { status: 500 }
    )
  }
}
