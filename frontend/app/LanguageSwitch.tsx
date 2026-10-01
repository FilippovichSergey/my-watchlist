"use client";

import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_COOKIE, t, type Locale } from "@/lib/i18n";

export function LanguageSwitch({ locale }: { locale: Locale }) {
  const router = useRouter();

  function choose(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div role="group" aria-label={t(locale, "nav.language")} className="flex rounded-full border border-gray-300 dark:border-gray-700 text-xs overflow-hidden">
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => choose(l)}
          aria-pressed={l === locale}
          className={`px-2.5 py-1 uppercase ${
            l === locale ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
