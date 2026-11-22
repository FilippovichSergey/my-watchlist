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

/**
 * On the deployed site about one list-to-list navigation in seven stalls: the answer arrives in a fraction
 * of a second, but the router does not show it until something else happens (measured on 2026-11-22; a
 * plain <Link> and a bare router.push stall alike, a local production build never does, and the cause in
 * the framework is not found yet). So a navigation is watched: if the address has not changed in time it
 * is asked for again, and if that does not help either the page is loaded the plain way, which always works.
 */
const RETRY_AFTER_MS = 1_200;
const FULL_LOAD_AFTER_MS = 2_600;
/** Set on <html> while a filter navigation is on its way; globals.css shows the bar by it. */
const PENDING_ATTRIBUTE = "data-navigating";

export function Providers({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const router = useRouter();
  // A filter change is a navigation. router.push is called as it is: the router runs its own transition
  // and keeps the current list on screen until the new one is ready.
  //
  // The progress indication lives outside React (an attribute on <html>, set here and removed when the
  // address has reached its target), so a filter change costs no render of its own.
  const target = useRef<string | null>(null);
  const shown = useRef<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const settle = useCallback(
    (href: string | null) => {
      target.current = href;
      timers.current.forEach(clearTimeout);
      timers.current = [];
      if (href === null) {
        document.documentElement.removeAttribute(PENDING_ATTRIBUTE);
        return;
      }
      document.documentElement.setAttribute(PENDING_ATTRIBUTE, "");
      timers.current = [
        setTimeout(() => target.current === href && router.push(href), RETRY_AFTER_MS),
        setTimeout(() => target.current === href && window.location.assign(href), FULL_LOAD_AFTER_MS),
      ];
    },
    [router]
  );
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
