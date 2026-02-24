import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth/auth-helpers"
import { logger } from "@/lib/logger"

export async function GET() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    return NextResponse.json({
      session: currentUser.session,
      user: currentUser.user,
    })
  } catch (error) {
    logger.error("Error fetching user:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
