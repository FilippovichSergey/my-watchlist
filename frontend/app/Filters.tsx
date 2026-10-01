"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "./providers";
import { EMPTY_FILTERS, queryWith, type FilterOptions, type FilterValues } from "@/lib/filters";

const RATINGS = [9, 8, 7, 6, 5];

export type { FilterOptions, FilterValues };

export function Filters({ values, options }: { values: FilterValues; options: FilterOptions }) {
  const router = useRouter();
  const t = useT();
  const [actor, setActor] = useState(values.actor);

  const go = (patch: Partial<FilterValues>) => router.push(queryWith(values, patch));
  const select = "border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-900";
  const hasAny = Object.entries(values).some(([k, v]) => k !== "category" && v);

  return (
    <form
      className="flex flex-wrap items-end gap-3 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        go({ actor });
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">{t("filter.year")}</span>
        <select className={select} value={values.year} onChange={(e) => go({ year: e.target.value })}>
          <option value="">{t("filter.any")}</option>
          {options.years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">{t("filter.country")}</span>
        <select className={select} value={values.country} onChange={(e) => go({ country: e.target.value })}>
          <option value="">{t("filter.any")}</option>
          {options.countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">{t("filter.genre")}</span>
        <select className={select} value={values.genre} onChange={(e) => go({ genre: e.target.value })}>
          <option value="">{t("filter.any")}</option>
          {options.genres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">{t("filter.actor")}</span>
        <input
          type="search"
          className={`${select} w-40`}
          placeholder={t("filter.actorPlaceholder")}
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          onBlur={() => actor !== values.actor && go({ actor })}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">{t("filter.rating")}</span>
        <select className={select} value={values.rating} onChange={(e) => go({ rating: e.target.value })}>
          <option value="">{t("filter.any")}</option>
          {RATINGS.map((r) => <option key={r} value={r}>≥ {r}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">{t("filter.myRating")}</span>
        <select className={select} value={values.my} onChange={(e) => go({ my: e.target.value })}>
          <option value="">{t("filter.any")}</option>
          {RATINGS.map((r) => <option key={r} value={r}>≥ {r}</option>)}
        </select>
      </label>
      {hasAny && (
        <button
          type="button"
          onClick={() => {
            setActor("");
            router.push(queryWith({ ...EMPTY_FILTERS, category: values.category }));
          }}
          className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 pb-2"
        >
          {t("filter.reset")}
        </button>
      )}
    </form>
  );
}
