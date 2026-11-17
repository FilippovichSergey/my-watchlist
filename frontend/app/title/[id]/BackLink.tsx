"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LIST_URL_KEY, OPENED_FROM_LIST_KEY, backAction } from "@/lib/back";

/** Back to the list as the visitor last saw it (filters, scroll); a plain link to "/" without JavaScript. */
export function BackLink({ label }: { label: string }) {
  const router = useRouter();
  // Read once and removed: the note is true for this arrival only, not for a later one from elsewhere
  const openedFromList = useRef(false);
  useEffect(() => {
    try {
      openedFromList.current = sessionStorage.getItem(OPENED_FROM_LIST_KEY) === window.location.pathname;
      sessionStorage.removeItem(OPENED_FROM_LIST_KEY);
    } catch {
      // storage unavailable
    }
  }, []);
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
        const action = backAction(listUrl, openedFromList.current);
        if (action.kind === "link") return;
        e.preventDefault();
        if (action.kind === "back") router.back();
        else router.push(action.href);
      }}
      className="focus-ring rounded text-sm text-muted transition-colors duration-150 hover:text-accent"
    >
      {label}
    </a>
  );
}
