"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useNavigation, useT } from "./providers";
import {
  ArrowDownUpIcon,
  CalendarIcon,
  ClapperboardIcon,
  FilterIcon,
  GlobeIcon,
  HeartIcon,
  SearchIcon,
  StarIcon,
  UserIcon,
} from "./icons";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  formatRatingRange,
  hasActiveFilters,
  parseRatingRange,
  queryWith,
  type FilterOptions,
  type FilterValues,
} from "@/lib/filters";
import { DEFAULT_SORT, SORT_KEYS, type SortKey } from "@/lib/sort";
import type { MessageKey } from "@/lib/i18n";

const RATINGS = [9, 8, 7, 6, 5];
const SCORES = Array.from({ length: 10 }, (_, i) => i + 1);
const SORT_LABELS: Record<SortKey, MessageKey> = {
  my: "sort.my",
  newest: "sort.newest",
  year: "sort.year",
  title: "sort.title",
  tmdb: "sort.tmdb",
};

export type { FilterOptions, FilterValues };

/** Every change is a navigation: the filters live in the URL and the page re-renders on the server. */
function useFilterNavigation(values: FilterValues) {
  const { navigate, pending } = useNavigation();
  return {
    pending,
    go: (patch: Partial<FilterValues>) => navigate(queryWith(values, patch)),
    reset: () => navigate(queryWith({ ...EMPTY_FILTERS, category: values.category, sort: values.sort })),
  };
}

function ResetButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className="hit-area-lg focus-ring rounded-lg px-3 py-[5px] text-xs font-semibold tracking-[0.1px] text-muted transition-colors duration-150 hover:text-accent"
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

/**
 * The owner's score as ten chips. One click picks that score; a click on a second chip picks the range
 * between the two; clicking the only picked score clears it. The value travels as "8" or "7-9", so
 * nothing here needs state of its own: the next click is read off the current value.
 */
function RatingRangePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const t = useT();
  const range = parseRatingRange(value);
  const single = range !== null && range.min === range.max ? range.min : null;

  function pick(score: number) {
    if (single === score) onChange("");
    else if (single !== null) onChange(formatRatingRange(Math.min(single, score), Math.max(single, score)));
    else onChange(String(score));
  }
  const picked = (score: number) => range !== null && score >= range.min && score <= range.max;
  const hint =
    range === null ? t("filter.myRatingHint") : single !== null ? t("filter.rangeHint", { n: single }) : `${range.min}–${range.max}`;

  return (
    <div className="flex flex-col gap-[6px]">
      <div role="group" aria-label={t("filter.myRating")} className="grid grid-cols-5 gap-1">
        {SCORES.map((score) => (
          <button
            key={score}
            type="button"
            aria-pressed={picked(score)}
            onClick={() => pick(score)}
            className={`focus-ring h-10 rounded-md border text-[13px] font-semibold tabular-nums transition-colors duration-150 desk:h-7 desk:text-xs ${
              picked(score) ? "border-accent bg-accent text-white" : "border-line bg-card text-ink hover:border-accent"
            }`}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="flex items-start justify-between gap-2 text-[11px] text-muted">
        <span>{hint}</span>
        {range !== null && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="focus-ring shrink-0 rounded font-semibold text-accent underline-offset-2 hover:underline"
          >
            {t("filter.clear")}
          </button>
        )}
      </div>
    </div>
  );
}

/** Sort order; a compact select in the desktop search row, a full field inside the mobile sheet. */
export function SortSelect({ values, sheet = false }: { values: FilterValues; sheet?: boolean }) {
  const t = useT();
  const { go } = useFilterNavigation(values);
  const select = (
    <select
      aria-label={t("sort.label")}
      className={sheet ? "control" : "control w-auto py-[6px]"}
      value={values.sort}
      onChange={(e) => go({ sort: e.target.value })}
    >
      {SORT_KEYS.map((key) => (
        <option key={key} value={key === DEFAULT_SORT ? "" : key}>
          {t(SORT_LABELS[key])}
        </option>
      ))}
    </select>
  );
  if (sheet) {
    return (
      <Field icon={<ArrowDownUpIcon size={14} />} label={t("sort.label")} className="col-span-2">
        {select}
      </Field>
    );
  }
  return (
    <label className="flex items-center gap-2">
      <span className="label-caps whitespace-nowrap">{t("sort.label")}</span>
      {select}
    </label>
  );
}

/** The six narrowing controls. In the bottom sheet (`sheet`) they sit in a two-column grid. */
function FilterFields({ values, options, sheet = false }: { values: FilterValues; options: FilterOptions; sheet?: boolean }) {
  const t = useT();
  const { go } = useFilterNavigation(values);
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
      <Field icon={<StarIcon size={size} />} label={sheet ? "TMDB" : t("filter.rating")} className={wide}>
        <select className="control" value={values.rating} onChange={(e) => go({ rating: e.target.value })}>
          {any}
          {RATINGS.map((r) => <option key={r} value={r}>≥ {r}</option>)}
        </select>
      </Field>
      <div className={`flex flex-col gap-[6px] desk:gap-[7px] ${wide}`}>
        <span className="label-caps flex items-center gap-[6px] desk:gap-[7px]">
          <span className="flex text-accent">
            <HeartIcon size={size} />
          </span>
          {t("filter.myRating")}
        </span>
        <RatingRangePicker value={values.my} onChange={(my) => go({ my })} />
      </div>
    </>
  );
}

/** Desktop: the sticky sidebar card. */
export function FilterPanel({ values, options }: { values: FilterValues; options: FilterOptions }) {
  const t = useT();
  const { reset, pending } = useFilterNavigation(values);
  return (
    <div className="card flex flex-col gap-[18px] px-5 pb-4 pt-5" aria-busy={pending}>
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
  const { go } = useFilterNavigation(values);
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
        className="h-11 w-full rounded-xl border border-line bg-card pl-10 pr-[14px] text-[15px] text-ink outline-none transition-colors duration-150 placeholder:text-muted focus:border-accent focus-visible:ring-2 focus-visible:ring-accent desk:h-auto desk:py-[10px] desk:text-sm"
      />
    </div>
  );
}

const FOCUSABLE = "select, input, button, a[href]";

/** Narrow screens: the "Filters" button with a count badge, opening a bottom sheet with the same controls. */
export function FilterSheet({ values, options, count }: { values: FilterValues; options: FilterOptions; count: number }) {
  const t = useT();
  const { reset } = useFilterNavigation(values);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const active = activeFilterCount(values);

  useEffect(() => {
    if (!open) return;
    // Focus moves into the sheet (its first field, not the Reset button) and comes back to the button that opened it
    panel.current?.querySelector<HTMLElement>("select, input")?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      trigger.current?.focus();
    };
  }, [open]);

  /** Tab stays inside the sheet while it is open. */
  function trapTab(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab" || !panel.current) return;
    const focusable = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`focus-ring flex h-11 items-center gap-[7px] rounded-xl border bg-card px-[14px] text-[13px] font-semibold transition-colors duration-150 ${
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
          <div
            ref={panel}
            onKeyDown={trapTab}
            className="absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col gap-4 overflow-y-auto rounded-t-3xl bg-card px-5 pb-[calc(2.75rem+env(safe-area-inset-bottom))] pt-[10px] text-ink shadow-strong"
          >
            <div className="mx-auto h-1 w-10 rounded-sm bg-line" />
            <div className="flex items-center justify-between">
              <span className="font-display text-[17px] font-semibold uppercase tracking-[0.8px]">{t("home.filters")}</span>
              <ResetButton onClick={reset} />
            </div>
            <div className="grid grid-cols-2 gap-[14px]">
              <SortSelect values={values} sheet />
              <FilterFields values={values} options={options} sheet />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="focus-ring w-full rounded-lg bg-accent px-[22px] py-[9px] text-[15px] font-semibold tracking-[0.1px] text-white transition-colors duration-150 hover:bg-accent-ink"
            >
              {t("home.show", { n: count })}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
