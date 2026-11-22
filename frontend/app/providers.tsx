"use client";

import { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { DEFAULT_LOCALE, t, type Locale, type MessageKey } from "@/lib/i18n";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

const NavigationContext = createContext<{
  navigate: (href: string) => void;
  /** Where the navigation still in flight leads, or null when the page shows the current URL. */
  pendingHref: () => string | null;
}>({
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
/** Set on <html> while a filter navigation is on its way; globals.css shows the bar by it. */
const PENDING_ATTRIBUTE = "data-navigating";

export function Providers({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const router = useRouter();
  // A filter change is a navigation. router.push is called as it is: the router runs its own transition
  // and keeps the current list on screen until the new one is ready.
  //
  // Nothing here may update React state at the moment of the click. A state update of ours next to the
  // router's transition (first useTransition's isPending, then a plain useState) made about one navigation
  // in six stall on the deployed site: the answer had arrived, but the new list was only shown when some
  // later update woke React up, which could be the next click. So the progress indication lives outside
  // React: an attribute on <html>, set here and removed when the address has reached its target.
  const target = useRef<string | null>(null);
  const shown = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const settle = useCallback((href: string | null) => {
    target.current = href;
    clearTimeout(timer.current);
    if (href === null) {
      document.documentElement.removeAttribute(PENDING_ATTRIBUTE);
    } else {
      document.documentElement.setAttribute(PENDING_ATTRIBUTE, "");
      timer.current = setTimeout(() => settle(null), PENDING_LIMIT_MS);
    }
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
      if (target.current === url) settle(null);
    },
    [settle]
  );
  const pendingHref = useCallback(() => target.current, []);
  // Stable for the whole session: consumers never re-render because of a navigation
  const navigation = useMemo(() => ({ navigate, pendingHref }), [navigate, pendingHref]);
  return (
    <SessionProvider>
      <LocaleContext.Provider value={locale}>
        <NavigationContext.Provider value={navigation}>
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

/** URL navigation for the filter controls. */
export function useNavigation() {
  return useContext(NavigationContext);
}

/**
 * A thin accent bar at the top of the window while a filter navigation is in flight. Always rendered and
 * shown by CSS from the attribute on <html>, so that showing it costs React no update.
 */
export function PendingBar({ label }: { label: string }) {
  return (
    <div role="status" className="pending-bar pointer-events-none fixed inset-x-0 top-0 z-20 h-0.5">
      <div className="h-full w-full animate-pulse bg-accent" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
