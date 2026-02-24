import { Resend } from "resend"

import {
  MagicLinkEmailTemplate,
} from "@/components/email-template/magic-link-email"
import { features } from "@/lib/config"
import { logger } from "@/lib/logger"

function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendMagicLinkEmail({
  to,
  magicLinkUrl,
} : {
  to : string;
  magicLinkUrl : string;
}) {
  // Skip email sending during E2E tests
  if (features.skipEmailInTest) {
    logger.info(`[TEST MODE] Skipping email send to ${to}`)
    logger.info(`[TEST MODE] Magic link URL: ${magicLinkUrl}`)
    return // Don't send actual email during tests
  }

  try {
    await getResendClient().emails.send({
      from: "Forma <noreply@forma.sh>", // Replace with your domain
      to,
      subject: "Sign in to your Forma account",
      react: MagicLinkEmailTemplate({ magicLinkUrl }),
    })

    logger.info(`✅ Magic link email sent to ${to}`)
  } catch (error) {
    logger.error("❌ Failed to send magic link email:", error)
    throw new Error("Failed to send email")
  }
}

