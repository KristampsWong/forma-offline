# Better Auth Template

A Next.js starter template with [Better Auth](https://www.better-auth.com/) authentication, MongoDB, and Google OAuth pre-configured.

## Features

- **Next.js 16** with App Router
- **Better Auth** for authentication
- **MongoDB** with Mongoose (cached connection pattern)
- **Google OAuth** sign-in
- **Session management** with cookie caching
- **Tailwind CSS 4** for styling
- **shadcn/ui** components
- **TypeScript** configured

## Use This Template

```bash
npx create-next-app --example https://github.com/KristampsWong/better-auth-template my-app
```

Then:

```bash
cd my-app
pnpm install
```

## Quick Start

### 1. Set up environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:

```env
BETTER_AUTH_SECRET=your-secret-key    # Generate with: openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/your-db
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
ALLOWED_EMAIL=you@gmail.com              # Restrict access to this Google account
```

### 2. Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Select **Web application**
6. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
7. Copy the Client ID and Client Secret to your `.env` file

### 3. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app.

## Project Structure

```
├── app/
│   ├── (auth)/
│   │   ├── api/auth/[...all]/route.ts  # Better Auth API handler
│   │   └── sign-in/page.tsx            # Sign-in page
│   ├── layout.tsx
│   └── page.tsx                         # Home page with session display
├── components/
│   ├── auth/
│   │   └── google-sign-in.tsx          # Google sign-in button
│   └── ui/                              # shadcn/ui components
├── lib/
│   ├── auth/
│   │   ├── auth.ts                     # Better Auth server config
│   │   └── auth-client.ts              # Better Auth client
│   ├── db/
│   │   └── dbConnect.ts                # MongoDB connection
│   ├── env.ts                          # Environment utilities
│   └── utils.ts
```

## Usage

### Client-side session access

```tsx
"use client"
import { useSession, signOut } from "@/lib/auth/auth-client"

function Component() {
  const { data: session, isPending } = useSession()

  if (session?.user) {
    return <p>Hello, {session.user.name}</p>
  }
}
```

### Server-side session access

```tsx
import { auth } from "@/lib/auth/auth"
import { headers } from "next/headers"

async function ServerComponent() {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  if (session?.user) {
    return <p>Hello, {session.user.name}</p>
  }
}
```

## Learn More

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Documentation](https://www.mongodb.com/docs/)
