"use client";

import { useT } from "./providers";

/** Replaces the page content when rendering it threw; "Try again" re-renders the segment. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  return (
    <div className="card mx-auto mt-12 max-w-md p-8 text-center">
      <p className="text-sm text-muted">{t("error.title")}</p>
      <button
        type="button"
        onClick={reset}
        className="focus-ring mt-4 rounded-lg bg-accent px-[22px] py-[9px] text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-accent-ink"
      >
        {t("error.retry")}
      </button>
    </div>
  );
}
