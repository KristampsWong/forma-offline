import { betterAuth } from "better-auth"
import { mongodbAdapter } from "better-auth/adapters/mongodb"
import dbConnect from "../db/dbConnect"
import { isBuildTime, isTestMode } from "@/lib/env"
import { magicLink } from "better-auth/plugins"
import { logger } from "@/lib/logger"
import { redis } from "@/lib/services/redis"
import { sendMagicLinkEmail } from "@/lib/services/email"

let auth: ReturnType<typeof betterAuth>
/**
 * Get the base URL for Better Auth
 * In test mode (Playwright), use PORT environment variable (default: 3001)
 * Otherwise, use BETTER_AUTH_URL from env (default: http://localhost:3000)
 */
function getBaseUrl(): string {
  if (isTestMode()) {
    const port = process.env.PORT || "3001"
    return `http://localhost:${port}`
  }
  return process.env.BETTER_AUTH_URL || "http://localhost:3000"
}
const baseUrl = getBaseUrl()
if (!isBuildTime()) {
  // Connect to MongoDB using cached connection pattern (avoids race conditions)
  const mongoose = await dbConnect()
  const db = mongoose.connection.getClient().db()

  auth = betterAuth({
    baseURL: baseUrl, // Use environment-aware base URL for cookies and redirects
    trustedOrigins: isTestMode()
      ? ["http://localhost:3000"] // Allow both ports in test mode
      : undefined, // Default behavior in production
    database: mongodbAdapter(db),
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, token }, _ctx) => {
          // Store only the email mapping (no verification code yet)
          // Verification code will be generated on-demand when user visits /magic-link page
          const ttl = 300 // 5 minutes

          // Store only email mapping in Redis
          await redis.set(`magic:email:${token}`, email, { ex: ttl })

          // Build the magic link URL using environment-aware base URL
          const magicLinkUrl = `${baseUrl}/magic-link?t=${token}`

          // Send email with ONLY the magic link (no verification code)
          try {
            await sendMagicLinkEmail({
              to: email,
              magicLinkUrl,
            })
          } catch (error) {
            logger.error("Failed to send magic link email:", error)
          }
        },
        expiresIn: 300, // 5 minutes
      }),
    ],
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5 minutes
      },
    },
  })
} else {
  // During build, auth is not functional — no requests are served
  auth = {} as ReturnType<typeof betterAuth>
}

export { auth }
