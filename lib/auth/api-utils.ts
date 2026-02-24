import { NextRequest, NextResponse } from "next/server"

import { isTestMode } from "@/lib/env"

/**
 * Extract client IP address from request headers
 *
 * @param request - The Next.js request object
 * @returns The client IP address from headers, or "anonymous" if not found
 */
export function getClientIp(request : NextRequest) : string {
  return (
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "anonymous"
  )
}

/**
 * Validate request origin to prevent direct API calls from external sources
 *
 * @param request - The Next.js request object
 * @returns True if origin is valid, false otherwise
 */
export function validateOrigin(request : NextRequest) : boolean {
  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")

  const allowedOrigins = [
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
    "http://localhost:3000", // Always allow localhost for development
    // Only allow E2E test port in test mode (Playwright runs on port 3001)
    ...(isTestMode() ? ["http://localhost:3001"] : []),
  ]

  // Check origin header
  if (origin && allowedOrigins.includes(origin)) {
    return true
  }

  // Check referer header as fallback
  if (referer && allowedOrigins.some((allowed) => referer.startsWith(allowed))) {
    return true
  }

  return false
}

/**
 * Create a rate limit error response with standard headers
 *
 * @param limit - Maximum number of requests allowed
 * @param remaining - Number of requests remaining in the current window
 * @param reset - Timestamp (in milliseconds) when the rate limit resets
 * @returns NextResponse with 429 status and rate limit headers
 */
export function createRateLimitResponse(
  limit : number,
  remaining : number,
  reset : number
) {
  return NextResponse.json(
    {
      error: "Too many requests. Please try again later.",
      limit,
      remaining,
      reset: new Date(reset).toISOString(),
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
      },
    }
  )
}

/**
 * Create a standard error response
 *
 * @param error - The error message to return
 * @param status - HTTP status code (default: 400)
 * @param additionalData - Optional additional data to include in the response
 * @returns NextResponse with error message and optional additional data
 */
export function createErrorResponse(
  error : string,
  status : number = 400,
  additionalData ?: Record<string, unknown>
) {
  return NextResponse.json(
    { error, ...additionalData },
    { status }
  )
}

/**
 * Create a success response
 *
 * @param data - The data object to return in the response
 * @returns NextResponse with 200 status and the provided data
 */
export function createSuccessResponse(data : Record<string, unknown>) {
  return NextResponse.json(data)
}
