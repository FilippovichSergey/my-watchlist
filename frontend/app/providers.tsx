"use client";

import { createContext, useCallback, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { DEFAULT_LOCALE, t, type Locale, type MessageKey } from "@/lib/i18n";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

const NavigationContext = createContext<{ pending: boolean; navigate: (href: string) => void }>({
  pending: false,
  navigate: () => {},
});

export function Providers({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const router = useRouter();
  // A filter change is a navigation; running it in a transition keeps the current list on screen
  // until the new one is ready, and `pending` lets the page show that something is happening.
  const [pending, startTransition] = useTransition();
  const navigate = useCallback((href: string) => startTransition(() => router.push(href)), [router]);
  return (
    <SessionProvider>
      <LocaleContext.Provider value={locale}>
        <NavigationContext.Provider value={{ pending, navigate }}>{children}</NavigationContext.Provider>
      </LocaleContext.Provider>
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

/** URL navigation with a pending flag, for the filter controls. */
export function useNavigation() {
  return useContext(NavigationContext);
}

/** A thin accent bar at the top of the window while a filter navigation is in flight. */
export function PendingBar({ label }: { label: string }) {
  const { pending } = useNavigation();
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-20 h-0.5">
      {pending && (
        <>
          <div className="h-full w-full animate-pulse bg-accent" />
          <span className="sr-only">{label}</span>
        </>
      )}
    </div>
  );
}
