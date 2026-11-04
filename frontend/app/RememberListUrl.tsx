"use client";

import { useEffect } from "react";

export const LIST_URL_KEY = "listUrl";

/** Remembers the list URL (with its filters) so a title page can lead back to the same view. */
export function RememberListUrl() {
  useEffect(() => {
    try {
      sessionStorage.setItem(LIST_URL_KEY, window.location.pathname + window.location.search);
    } catch {
      // storage unavailable: the back link falls back to the plain list
    }
  }, []);
  return null;
}
