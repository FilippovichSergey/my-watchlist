"use client";

import { useT } from "../providers";

const SCORES = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

/** The owner's 1-10 score; empty means "not rated". */
export function RatingSelect({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  const t = useT();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">{t("admin.myRating")}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1 text-sm bg-white dark:bg-gray-900"
      >
        <option value="">{t("admin.noRating")}</option>
        {SCORES.map((s) => (
          <option key={s} value={s}>★ {s}</option>
        ))}
      </select>
    </label>
  );
}

export function CategoryPicker({ value, onChange }: { value: string; onChange: (category: "MOVIE" | "ANIME" | "SERIAL") => void }) {
  const t = useT();
  const labels = { MOVIE: t("cat.movies"), ANIME: t("cat.anime"), SERIAL: t("cat.serials") } as const;
  return (
    <div className="flex gap-2">
      {(["MOVIE", "ANIME", "SERIAL"] as const).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`px-3 py-1 text-sm rounded-full border ${
            value === c ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900" : "border-gray-300 dark:border-gray-700"
          }`}
        >
          {labels[c]}
        </button>
      ))}
    </div>
  );
}
