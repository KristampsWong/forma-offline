import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import dbConnect from "../db/dbConnect";
import { isBuildTime } from "@/lib/env";

let auth: ReturnType<typeof betterAuth>

if (!isBuildTime()) {
  // Connect to MongoDB using cached connection pattern (avoids race conditions)
  const mongoose = await dbConnect()
  const db = mongoose.connection.getClient().db()

  auth = betterAuth({
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
  });
} else {
  // During build, auth is not functional — no requests are served
  auth = {} as ReturnType<typeof betterAuth>
}

export { auth };
