"use client";

import { Suspense, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { DEFAULT_LOCALE, t, type Locale, type MessageKey } from "@/lib/i18n";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

const NavigationContext = createContext<{
  pending: boolean;
  navigate: (href: string) => void;
  /** Where the navigation still in flight leads, or null when the page shows the current URL. */
  pendingHref: () => string | null;
}>({
  pending: false,
  navigate: () => {},
  pendingHref: () => null,
});

/** Reports the address the page currently shows; kept apart because useSearchParams needs a Suspense boundary. */
function CurrentUrl({ onChange }: { onChange: (url: string) => void }) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  useEffect(() => onChange(query ? `${pathname}?${query}` : pathname), [pathname, query, onChange]);
  return null;
}

/** A navigation that has not arrived after this long is no longer shown as pending. */
const PENDING_LIMIT_MS = 10_000;

export function Providers({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const router = useRouter();
  // A filter change is a navigation. router.push is called as it is: the router runs its own transition
  // and keeps the current list on screen until the new one is ready. Wrapping it in a transition of our
  // own made the router drop some navigations in production (the address never changed and the bar
  // stayed), so "pending" is derived instead: a target is set and the address has not reached it yet.
  const [target, setTarget] = useState<string | null>(null);
  // The ref mirrors the state for handlers: two changes in one tick (blur of the search field, then the
  // click that caused it) must see each other before React renders anything.
  const targetRef = useRef<string | null>(null);
  const shown = useRef<string | null>(null);
  const settle = useCallback((href: string | null) => {
    targetRef.current = href;
    setTarget(href);
  }, []);
  const navigate = useCallback(
    (href: string) => {
      if (href !== shown.current) settle(href);
      router.push(href);
    },
    [router, settle]
  );
  const onUrl = useCallback(
    (url: string) => {
      shown.current = url;
      if (targetRef.current === url) settle(null);
    },
    [settle]
  );
  useEffect(() => {
    if (target === null) return;
    const timer = setTimeout(() => settle(null), PENDING_LIMIT_MS);
    return () => clearTimeout(timer);
  }, [target, settle]);
  const pendingHref = useCallback(() => targetRef.current, []);
  return (
    <SessionProvider>
      <LocaleContext.Provider value={locale}>
        <NavigationContext.Provider value={{ pending: target !== null, navigate, pendingHref }}>
          <Suspense>
            <CurrentUrl onChange={onUrl} />
          </Suspense>
          {children}
        </NavigationContext.Provider>
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
