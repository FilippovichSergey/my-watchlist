"use client";

import { createContext, useCallback, useContext } from "react";
import { SessionProvider } from "next-auth/react";
import { DEFAULT_LOCALE, t, type Locale, type MessageKey } from "@/lib/i18n";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function Providers({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
    </SessionProvider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Translation function bound to the current UI language. */
export function useT() {
  const locale = useLocale();
  return useCallback((key: MessageKey, vars?: Record<string, string | number>) => t(locale, key, vars), [locale]);
}
