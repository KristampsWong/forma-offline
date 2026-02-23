import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import dbConnect from "../db/dbConnect";
import { logger } from "../logger";

// Connect to MongoDB
// Connect to MongoDB using cached connection pattern (avoids race conditions)
const mongoose = await dbConnect()

// Get the native MongoDB database for Better Auth
const db = mongoose.connection.getClient().db()

export const auth = betterAuth({
  database: mongodbAdapter(db),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const allowedEmail = process.env.ALLOWED_EMAIL
          if (allowedEmail && user.email !== allowedEmail) {
            logger.warn(`Blocked sign-up attempt from: ${user.email}`)
            throw new Error("Unauthorized email address")
          }
        },
      },
    },
  },
});
