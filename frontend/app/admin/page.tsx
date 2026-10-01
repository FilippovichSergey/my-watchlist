"use client";

import { Suspense, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { AdminPanel } from "./AdminPanel";

export default function AdminPage() {
  // useSearchParams needs a Suspense boundary on a statically rendered page
  return (
    <Suspense fallback={<p className="text-gray-500">Loading...</p>}>
      <AdminGate />
    </Suspense>
  );
}

function AdminGate() {
  const { data: session, status } = useSession();
  // Auth.js sends rejected sign-ins (accounts outside ADMIN_EMAILS) back here with this flag
  const errorCode = useSearchParams().get("error");
  const [expired, setExpired] = useState(false);
  const handleExpired = useCallback(() => setExpired(true), []);

  if (status === "loading") return <p className="text-gray-500">Loading...</p>;

  if (!session || session.error || expired) {
    const message =
      errorCode === "AccessDenied"
        ? "This Google account is not allowed to manage the watchlist."
        : errorCode
          ? `Sign-in failed (${errorCode}). The frontend server log has the details.`
          : session?.error || expired
            ? "Your session has expired. Please sign in again."
            : "Sign in to manage your watchlist.";
    return <SignInPrompt message={message} />;
  }

  return (
    <AdminPanel
      onSessionExpired={handleExpired}
      account={{ email: session.user?.email ?? null, id: session.user?.id ?? null }}
    />
  );
}

function SignInPrompt({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 mt-20">
      <p className="text-gray-600 dark:text-gray-400 text-center">{message}</p>
      <button
        onClick={() => signIn("google", { redirectTo: "/admin" })}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Sign in with Google
      </button>
    </div>
  );
}
