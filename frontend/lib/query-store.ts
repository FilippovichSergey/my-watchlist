import { useSyncExternalStore } from "react";
import { filtersFrom, type FilterValues } from "./filters";

/*
 * The list's filters live in the address bar, and on the list page the address is changed right here in
 * the browser: the whole list is already on the page, so a filter, a sort order or a category tab needs
 * no answer from the server. (Until 1.0.8 every change was a server navigation, and on the deployed site
 * about one in ten of those stalled inside the framework's router.) history.pushState keeps links,
 * back and forward working; the framework's router is told through its own patch of that method.
 */

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

/** The query string of the address right now, without the question mark. */
export const currentQuery = (): string => window.location.search.replace(/^[?]/, "");

/** Goes to a list address such as "/?category=ANIME" without asking the server. */
export function pushQuery(href: string): void {
  if (href === window.location.pathname + window.location.search) return;
  window.history.pushState(null, "", href);
  listeners.forEach((listener) => listener());
}

/**
 * Tells the readers that the address may have changed in a way this module did not see: a navigation of
 * the framework's router (a link from a title page to the list) changes it after the page has rendered.
 */
export function addressChanged(): void {
  listeners.forEach((listener) => listener());
}

/** The query string, live; `serverQuery` is what the server rendered with (used until hydration). */
export function useQuery(serverQuery: string): string {
  return useSyncExternalStore(subscribe, currentQuery, () => serverQuery);
}

export function valuesFromQuery(query: string): FilterValues {
  const params = new URLSearchParams(query);
  return filtersFrom((key) => params.get(key));
}
