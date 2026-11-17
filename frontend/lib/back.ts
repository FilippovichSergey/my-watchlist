/** sessionStorage keys shared by the list and the title page. */
export const LIST_URL_KEY = "listUrl";
/** Path of the title page the visitor has just opened by clicking a card in the list. */
export const OPENED_FROM_LIST_KEY = "openedFromList";

export type BackAction = { kind: "link" } | { kind: "back" } | { kind: "push"; href: string };

/**
 * What "back to the list" does on a title page.
 * - No remembered list: the plain link to "/" does its job.
 * - The page was opened from the list a moment ago: one step back in history returns to that very
 *   view, scroll position included.
 * - Anything else (a shared link, a reload, an arrival from another site): go to the remembered list
 *   by its address. History is not trusted then; its previous entry may be someone else's page.
 */
export function backAction(listUrl: string | null, openedFromList: boolean): BackAction {
  if (!listUrl || !listUrl.startsWith("/") || listUrl.startsWith("//")) return { kind: "link" };
  return openedFromList ? { kind: "back" } : { kind: "push", href: listUrl };
}

/** The href of a title page if this is one, e.g. "/title/12"; null for any other link. */
export function titlePath(href: string | null | undefined): string | null {
  return href && /^[/]title[/][0-9]+$/.test(href) ? href : null;
}
