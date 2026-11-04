"use client";

import { useRouter } from "next/navigation";
import { LIST_URL_KEY } from "../../RememberListUrl";

/** Back to the list as the visitor last saw it (filters, scroll); a plain link to "/" without JavaScript. */
export function BackLink({ label }: { label: string }) {
  const router = useRouter();
  return (
    <a
      href="/"
      onClick={(e) => {
        let listUrl: string | null = null;
        try {
          listUrl = sessionStorage.getItem(LIST_URL_KEY);
        } catch {
          // storage unavailable
        }
        if (!listUrl) return;
        e.preventDefault();
        if (window.history.length > 1) router.back();
        else router.push(listUrl);
      }}
      className="focus-ring rounded text-sm text-muted transition-colors duration-150 hover:text-accent"
    >
      {label}
    </a>
  );
}
