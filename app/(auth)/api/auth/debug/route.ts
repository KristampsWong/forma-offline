import { auth } from "@/lib/auth/auth"
import { isBuildTime } from "@/lib/env"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const hdrs = await headers()
    const cookieHeader = hdrs.get("cookie") || "NO COOKIES"

    // Check if auth is initialized
    const authInitialized = typeof auth?.api?.getSession === "function"

    if (!authInitialized) {
      return NextResponse.json({
        error: "auth not initialized",
        isBuildTime: isBuildTime(),
      })
    }

    const session = await auth.api.getSession({ headers: hdrs })

    return NextResponse.json({
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id || null,
      email: session?.user?.email || null,
      isBuildTime: isBuildTime(),
      cookiesPresent: cookieHeader.includes("better-auth.session_token"),
      cookieSnippet: cookieHeader.substring(0, 200),
    })
  } catch (error) {
    return NextResponse.json({
      error: String(error),
      message: error instanceof Error ? error.message : "unknown",
      stack: error instanceof Error ? error.stack?.substring(0, 500) : null,
    })
  }
}
