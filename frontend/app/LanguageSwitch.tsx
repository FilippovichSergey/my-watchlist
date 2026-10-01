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
    <div
      role="group"
      aria-label={t(locale, "nav.language")}
      className="flex overflow-hidden rounded-[20px] border border-white/20 text-[11px] font-bold uppercase tracking-[0.6px]"
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => choose(l)}
          aria-pressed={l === locale}
          className={`px-[11px] py-[6px] transition-colors duration-150 desk:py-[5px] ${
            l === locale ? "bg-accent text-white" : "text-white/55 hover:text-white"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
