import OpenAI from "openai"

import { isBuildTime } from "@/lib/env"

let client: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (isBuildTime()) {
    throw new Error("OpenAI client is not available during build time")
  }

  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error("Missing required environment variable: OPENAI_API_KEY")
    }
    client = new OpenAI({ apiKey })
  }

  return client
}
