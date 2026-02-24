import { randomInt } from "crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { AuthCard } from "@/components/auth/auth-card"
import dbConnect from "@/lib/db/dbConnect"
import { redis } from "@/lib/services/redis"

import VerificationCodeUI from "./verification-code-ui"

interface MagicLinkPageProps {
  searchParams: Promise<{ t?: string }>
}

/**
 * Check if the current request is from the same device that initiated the magic link
 */
async function checkSameDevice(
  deviceSessionId: string | undefined,
  email: string
): Promise<boolean> {
  if (!deviceSessionId) return false

  const deviceSession = await redis.get(`magic:device:${deviceSessionId}`)
  if (!deviceSession) return false

  try {
    const session = JSON.parse(String(deviceSession))
    return session.email === email
  } catch {
    return false
  }
}

/**
 * Generate verification code for magic link (idempotent with atomic lock)
 */
async function generateVerificationCode(
  token: string,
  remainingTTL: number
): Promise<void> {
  const codeGenerated = await redis.get(`magic:code-generated:${token}`)
  if (codeGenerated) return

  // Use atomic SET NX to prevent race condition
  const lockKey = `magic:code-lock:${token}`
  const lockAcquired = await redis.set(lockKey, "1", {
    ex: 10, // 10 second lock
    nx: true, // Only set if not exists
  })

  if (!lockAcquired) {
    // Another process is generating, wait briefly
    await new Promise((resolve) => setTimeout(resolve, 100))
    return
  }

  // Generate code and store with synchronized TTL
  const verificationCode = randomInt(100000, 1000000).toString()

  await Promise.all([
    redis.set(`magic:token:${token}`, verificationCode, { ex: remainingTTL }),
    redis.set(`magic:code:${verificationCode}`, token, { ex: remainingTTL }),
    redis.set(`magic:code-generated:${token}`, "true", { ex: remainingTTL }),
    redis.del(lockKey), // Release lock
  ])
}

export default async function MagicLinkPage({
  searchParams,
} : MagicLinkPageProps) {
  const params = await searchParams
  const token = params.t

  // If no token, show error
  if (!token) {
    return (
      <AuthCard
        title="Invalid link"
        description="This magic link is invalid or missing required parameters."
      />
    )
  }

  // Parallel: Check token validity, get TTL, and check device session
  const [email, remainingTTL, cookieStore] = await Promise.all([
    redis.get(`magic:email:${token}`),
    redis.ttl(`magic:email:${token}`),
    cookies(),
  ])

  // Check if token is valid (email exists in Redis)
  if (!email) {
    return (
      <AuthCard
        title="Link expired"
        description="This magic link has expired. Please request a new one."
      />
    )
  }

  // Check if TTL expired
  if (remainingTTL <= 0) {
    return (
      <AuthCard
        title="Link expired"
        description="This magic link has expired. Please request a new one."
      />
    )
  }

  const emailString = String(email)

  // Device detection: Check if request came from same device
  const deviceSessionId = cookieStore.get("device_session")?.value
  const isSameDevice = await checkSameDevice(deviceSessionId, emailString)

  // SAME DEVICE: Smart auto-login for returning users
  if (isSameDevice) {
    const mongoose = await dbConnect()
    const db = mongoose.connection.getClient().db()
    const existingUser = await db.collection("user").findOne({ email: emailString })

    if (existingUser) {
      // Auto-redirect to Better Auth verify endpoint
      redirect(`/api/auth/magic-link/verify?token=${token}&callbackURL=/`)
    }
  }

  // DIFFERENT DEVICE or NEW USER: Generate code and show UI
  await generateVerificationCode(token, remainingTTL)

  return <VerificationCodeUI token={token} />
}
