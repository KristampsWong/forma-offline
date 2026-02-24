/**
 * Magic Link Email Template
 * Using React Email components for better email client compatibility
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components"

interface MagicLinkEmailProps {
  magicLinkUrl : string;
}

export function MagicLinkEmailTemplate({
  magicLinkUrl,
} : MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Sign in to your Forma account</Preview>
      <Body className="bg-white font-sans">
        <Container className="mx-auto py-5 px-5 max-w-2xl">
          {/* Header */}
          <Section className="bg-linear-to-r from-purple-600 to-purple-800 p-8 text-center rounded-t-xl">
            <Heading className="text-white text-3xl font-bold m-0">
              Magic Link Sign In
            </Heading>
          </Section>

          {/* Body */}
          <Section className="bg-gray-50 p-10 rounded-b-xl">
            <Text className="text-base text-gray-900 mb-5">Hi there,</Text>

            <Text className="text-base text-gray-900 mb-8">
              You requested to sign in to your Forma account. Click the button below to continue:
            </Text>

            {/* CTA Button */}
            <Section className="text-center mb-8">
              <Button
                href={magicLinkUrl}
                className="bg-linear-to-r from-purple-600 to-purple-800 text-white px-10 py-3 rounded-lg font-semibold text-base no-underline inline-block"
              >
                Sign In to Forma
              </Button>
            </Section>

            {/* Cross-Device Support */}
            <Section className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded mb-5">
              <Text className="m-0 text-sm text-blue-800">
                <strong>Cross-Device Login:</strong> You can click this link on any device.
                If you&apos;re using a different device than where you started the sign-in,
                we&apos;ll show you a verification code to enter.
              </Text>
            </Section>

            <Text className="text-sm text-gray-600">
              This link will expire in 5 minutes. If you didn&apos;t request this, you can safely ignore this email.
            </Text>
          </Section>

          {/* Footer */}
          <Section className="text-center p-5">
            <Text className="text-xs text-gray-400 m-0">
              © {new Date().getFullYear()} Forma. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

/**
 * Generate plain text version
 */
export function getMagicLinkEmailText({
  magicLinkUrl,
} : MagicLinkEmailProps) : string {
  return `
Hi there,

You requested to sign in to your Forma account.

Click this magic link to continue:
${magicLinkUrl}

Cross-Device Login: You can click this link on any device. If you're using a different device than where you started the sign-in, we'll show you a verification code to enter.

This link will expire in 5 minutes. If you didn't request this, you can safely ignore this email.

© ${new Date().getFullYear()} Forma. All rights reserved.
  `.trim()
}
