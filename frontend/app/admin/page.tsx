"use client";

import { Suspense, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useT } from "../providers";
import { AdminPanel } from "./AdminPanel";

export default function AdminPage() {
  const t = useT();
  // useSearchParams needs a Suspense boundary on a statically rendered page
  return (
    <Suspense fallback={<p className="text-gray-500">{t("admin.loading")}</p>}>
      <AdminGate />
    </Suspense>
  );
}

function AdminGate() {
  const t = useT();
  const { data: session, status } = useSession();
  // Auth.js sends rejected sign-ins (accounts outside the allowlist) back here with this flag
  const errorCode = useSearchParams().get("error");
  const [expired, setExpired] = useState(false);
  const handleExpired = useCallback(() => setExpired(true), []);

  if (status === "loading") return <p className="text-gray-500">{t("admin.loading")}</p>;

  if (!session || session.error || expired) {
    const message =
      errorCode === "AccessDenied"
        ? t("admin.accessDenied")
        : errorCode
          ? t("admin.signInFailed", { code: errorCode })
          : session?.error || expired
            ? t("admin.sessionExpired")
            : t("admin.signInPrompt");
    return (
      <div className="flex flex-col items-center gap-4 mt-20">
        <p className="text-gray-600 dark:text-gray-400 text-center">{message}</p>
        <button
          onClick={() => signIn("google", { redirectTo: "/admin" })}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {t("admin.signIn")}
        </button>
      </div>
    );
  }

  return (
    <AdminPanel
      onSessionExpired={handleExpired}
      account={{ email: session.user?.email ?? null, id: session.user?.id ?? null }}
    />
  );
}
