"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useT } from "./providers";
import { filtersFrom, queryWith } from "@/lib/filters";

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
  const params = useSearchParams();
  const values = filtersFrom((key) => params.get(key));
  const active = pathname === "/" ? values.category || "ALL" : null;
  return (
    <nav
      className="no-scrollbar order-last -mx-[18px] flex basis-full gap-1 overflow-x-auto px-[18px] pb-3 pt-2 desk:order-none desk:mx-0 desk:basis-auto desk:overflow-visible desk:p-0"
    >
      {TABS.map(([value, key]) => (
        <Link
          key={value}
          href={queryWith(values, { category: value })}
          className={`whitespace-nowrap rounded-lg px-[18px] py-[6px] text-sm font-semibold tracking-[0.1px] transition-all duration-150 ${
            active === value ? "bg-accent text-white" : "text-white/55 hover:bg-white/[.08] hover:text-white"
          }`}
        >
          {t(key)}
        </Link>
      ))}
    </nav>
  );
}
