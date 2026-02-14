import { z } from "zod"

/**
 * Validation schema for magic link request
 * Used in API route: /api/auth/request-magic-link
 */
export const magicLinkRequestSchema = z.object({
  email: z
    .email({ message: "Invalid email format" })
    .toLowerCase()
    .trim(),
})

export type MagicLinkRequestInput = z.infer<typeof magicLinkRequestSchema>

/**
 * Validation schema for user name collection
 * Used when magic link users need to provide their name after authentication
 */
export const userNameSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Name must be at least 2 characters." })
    .max(100, { message: "Name must be at most 100 characters." })
    .regex(/^[a-zA-Z\s'-]+$/, {
      message:
        "Name can only contain letters, spaces, hyphens, and apostrophes.",
    }),
})

export type UserNameFormValues = z.infer<typeof userNameSchema>
