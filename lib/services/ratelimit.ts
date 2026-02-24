import { Ratelimit } from "@upstash/ratelimit"

import { redis } from "@/lib/services/redis"

/**
 * Rate limiter for magic link code retrieval
 * Limits: 5 requests per minute per IP
 */
export const magicCodeRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  analytics: true,
  prefix: "@upstash/ratelimit:magic-code",
})

/**
 * Rate limiter for magic code verification
 * Limits: 3 requests per minute per IP
 * (Stricter because this is the actual authentication step)
 */
export const verifyCodeRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 m"),
  analytics: true,
  prefix: "@upstash/ratelimit:verify-code",
})

/**
 * Rate limiter for magic link requests
 * Limits: 5 requests per 10 minutes per email address
 * Prevents email enumeration and spam
 */
export const emailRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  analytics: true,
  prefix: "@upstash/ratelimit:magic-link-email",
})
