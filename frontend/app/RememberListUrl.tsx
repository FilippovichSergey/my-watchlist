"use client";

import { useEffect } from "react";
import { LIST_URL_KEY, OPENED_FROM_LIST_KEY, titlePath } from "@/lib/back";

/**
 * Remembers the list URL so a title page can lead back to the same view. A filter change keeps this
 * component mounted, so the URL is stored again whenever the address changes, not only on arrival.
 * It also notes which title the visitor opens from here: only then is "back" a step in history.
 */
export function RememberListUrl({ query }: { query: string }) {
  useEffect(() => {
    try {
      sessionStorage.setItem(LIST_URL_KEY, query ? `/?${query}` : "/");
    } catch {
      // storage unavailable: the back link falls back to the plain list
    }
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a");
      const path = titlePath(link?.getAttribute("href"));
      // A new tab or window keeps this page where it is: nothing to step back to there
      if (!path || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
      try {
        sessionStorage.setItem(OPENED_FROM_LIST_KEY, path);
      } catch {
        // storage unavailable
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
