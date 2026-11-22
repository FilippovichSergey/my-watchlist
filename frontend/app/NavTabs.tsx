"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useT } from "./providers";
import { queryWith } from "@/lib/filters";
import { addressChanged, currentQuery, pushQuery, useQuery, valuesFromQuery } from "@/lib/query-store";

const TABS = [
  ["ALL", "cat.all"],
  ["MOVIE", "cat.movies"],
  ["ANIME", "cat.anime"],
  ["SERIAL", "cat.serials"],
] as const;

/** Category tabs in the header; they keep the other filters and only mark a tab active on the home page. */
export function NavTabs() {
  const t = useT();
  const pathname = usePathname();
  // Live address: on the list page it changes without the router (see lib/query-store)
  const routerQuery = useSearchParams().toString();
  const values = valuesFromQuery(useQuery(routerQuery));
  // And when the router did navigate, it sets the address only after rendering: read it again then
  useEffect(() => addressChanged(), [pathname, routerQuery]);
  const active = pathname === "/" ? values.category || "ALL" : null;
  return (
    <nav
      aria-label={t("nav.sections")}
      className="no-scrollbar order-last -mx-[18px] flex basis-full gap-1 overflow-x-auto px-[18px] pb-3 pt-2 desk:order-none desk:mx-0 desk:basis-auto desk:overflow-visible desk:p-0"
    >
      {TABS.map(([value, key]) => (
        <Link
          key={value}
          href={queryWith(values, { category: value })}
          onClick={(e) => {
            // On the list a tab is one more filter change, made in the browser like the others. Modified
            // clicks (new tab) and other pages keep the plain link.
            if (pathname !== "/" || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
            e.preventDefault();
            pushQuery(queryWith(valuesFromQuery(currentQuery()), { category: value }));
          }}
          aria-current={active === value ? "page" : undefined}
          className={`hit-area focus-ring-dark inline-flex items-center whitespace-nowrap rounded-lg px-[18px] py-[6px] text-sm font-semibold tracking-[0.1px] transition-all duration-150 ${
            active === value ? "bg-accent text-white" : "text-white/55 hover:bg-white/[.08] hover:text-white"
          }`}
        >
          {t(key)}
        </Link>
      ))}
    </nav>
  );
}
