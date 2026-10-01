"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useT } from "./providers";
import { CalendarIcon, ClapperboardIcon, FilterIcon, GlobeIcon, HeartIcon, SearchIcon, StarIcon, UserIcon } from "./icons";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  hasActiveFilters,
  queryWith,
  type FilterOptions,
  type FilterValues,
} from "@/lib/filters";

const RATINGS = [9, 8, 7, 6, 5];

export type { FilterOptions, FilterValues };

/** Every change is a navigation: the filters live in the URL and the page re-renders on the server. */
function useNavigate(values: FilterValues) {
  const router = useRouter();
  return {
    go: (patch: Partial<FilterValues>) => router.push(queryWith(values, patch)),
    reset: () => router.push(queryWith({ ...EMPTY_FILTERS, category: values.category })),
  };
}

function ResetButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-3 py-[5px] text-xs font-semibold tracking-[0.1px] text-muted transition-colors duration-150 hover:text-accent"
    >
      {t("filter.reset")}
    </button>
  );
}

function Field({ icon, label, className = "", children }: { icon: ReactNode; label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`flex flex-col gap-[6px] desk:gap-[7px] ${className}`}>
      <span className="label-caps flex items-center gap-[6px] desk:gap-[7px]">
        <span className="flex text-accent">{icon}</span>
        {label}
      </span>
      {children}
    </label>
  );
}

/** The six narrowing controls. In the bottom sheet (`sheet`) they sit in a two-column grid. */
function FilterFields({ values, options, sheet = false }: { values: FilterValues; options: FilterOptions; sheet?: boolean }) {
  const t = useT();
  const { go } = useNavigate(values);
  const [actor, setActor] = useState(values.actor);
  // Reset (and back/forward navigation) change the URL without touching this field
  useEffect(() => setActor(values.actor), [values.actor]);
  const commitActor = () => actor.trim() !== values.actor && go({ actor: actor.trim() });
  const size = sheet ? 14 : 15;
  const wide = sheet ? "col-span-2" : "";
  const any = <option value="">{t("filter.any")}</option>;

  return (
    <>
      <Field icon={<CalendarIcon size={size} />} label={t("filter.year")}>
        <select className="control" value={values.year} onChange={(e) => go({ year: e.target.value })}>
          {any}
          {options.years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </Field>
      <Field icon={<GlobeIcon size={size} />} label={t("filter.country")}>
        <select className="control" value={values.country} onChange={(e) => go({ country: e.target.value })}>
          {any}
          {options.countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </Field>
      <Field icon={<ClapperboardIcon size={size} />} label={t("filter.genre")} className={wide}>
        <select className="control" value={values.genre} onChange={(e) => go({ genre: e.target.value })}>
          {any}
          {options.genres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </Field>
      <Field icon={<UserIcon size={size} />} label={t("filter.actor")} className={wide}>
        <input
          type="text"
          className="control"
          placeholder={t("filter.actorPlaceholder")}
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          onBlur={commitActor}
          onKeyDown={(e) => e.key === "Enter" && commitActor()}
        />
      </Field>
      <Field icon={<StarIcon size={size} />} label={sheet ? "TMDB" : t("filter.rating")}>
        <select className="control" value={values.rating} onChange={(e) => go({ rating: e.target.value })}>
          {any}
          {RATINGS.map((r) => <option key={r} value={r}>≥ {r}</option>)}
        </select>
      </Field>
      <Field icon={<HeartIcon size={size} />} label={t("filter.myRating")}>
        <select className="control" value={values.my} onChange={(e) => go({ my: e.target.value })}>
          {any}
          {RATINGS.map((r) => <option key={r} value={r}>≥ {r}</option>)}
        </select>
      </Field>
    </>
  );
}

/** Desktop: the sticky sidebar card. */
export function FilterPanel({ values, options }: { values: FilterValues; options: FilterOptions }) {
  const t = useT();
  const { reset } = useNavigate(values);
  return (
    <div className="card flex flex-col gap-[18px] px-5 pb-4 pt-5">
      <div className="flex items-center justify-between">
        <span className="font-display text-base font-semibold uppercase tracking-[0.8px]">{t("home.filters")}</span>
        {hasActiveFilters(values) && <ResetButton onClick={reset} />}
      </div>
      <FilterFields values={values} options={options} />
    </div>
  );
}

/** Title search; applied on Enter or when the field loses focus. */
export function SearchBar({ values }: { values: FilterValues }) {
  const t = useT();
  const { go } = useNavigate(values);
  const [q, setQ] = useState(values.q);
  useEffect(() => setQ(values.q), [values.q]);
  const commit = () => q.trim() !== values.q && go({ q: q.trim() });
  return (
    <div className="relative flex flex-1 items-center">
      <SearchIcon size={16} className="pointer-events-none absolute left-[14px] text-muted" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        placeholder={t("home.search")}
        aria-label={t("home.search")}
        className="h-11 w-full rounded-xl border border-line bg-card pl-10 pr-[14px] text-[15px] text-ink outline-none transition-colors duration-150 placeholder:text-muted focus:border-accent desk:h-auto desk:py-[10px] desk:text-sm"
      />
    </div>
  );
}

/** Narrow screens: the "Filters" button with a count badge, opening a bottom sheet with the same controls. */
export function FilterSheet({ values, options, count }: { values: FilterValues; options: FilterOptions; count: number }) {
  const t = useT();
  const { reset } = useNavigate(values);
  const [open, setOpen] = useState(false);
  const active = activeFilterCount(values);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex h-11 items-center gap-[7px] rounded-xl border bg-card px-[14px] text-[13px] font-semibold transition-colors duration-150 ${
          active > 0 ? "border-accent text-accent" : "border-line text-ink"
        }`}
      >
        <FilterIcon size={16} />
        {t("home.filters")}
        {active > 0 && (
          <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-[5px] text-[11px] font-bold text-white">
            {active}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={t("home.filters")}>
          <div className="absolute inset-0 bg-black/45" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col gap-4 overflow-y-auto rounded-t-3xl bg-card px-5 pb-11 pt-[10px] text-ink shadow-strong">
            <div className="mx-auto h-1 w-10 rounded-sm bg-line" />
            <div className="flex items-center justify-between">
              <span className="font-display text-[17px] font-semibold uppercase tracking-[0.8px]">{t("home.filters")}</span>
              <ResetButton onClick={reset} />
            </div>
            <div className="grid grid-cols-2 gap-[14px]">
              <FilterFields values={values} options={options} sheet />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-lg bg-accent px-[22px] py-[9px] text-[15px] font-semibold tracking-[0.1px] text-white transition-colors duration-150 hover:bg-accent-ink"
            >
              {t("home.show", { n: count })}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
