"use client";

import { useSession, signOut } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
export default function Home() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="w-full max-w-md p-8">
        {session?.user ? (
          <div className="space-y-6 text-center">
            {session.user.image && (
              <Image
                src={session.user.image}
                alt={session.user.name || "User"}
                width={80}
                height={80}
                className="mx-auto rounded-full"
              />
            )}
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {session.user.name}
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {session.user.email}
              </p>
            </div>
            <Button
              onClick={() => signOut()}
              variant="outline"
              className="w-full"
            >
              Sign out
            </Button>
          </div>
        ) : (
          <div className="space-y-6 text-center">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Welcome
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Sign in to get started
            </p>
            <Link href="/sign-in">
              <Button className="w-full">Sign in</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
