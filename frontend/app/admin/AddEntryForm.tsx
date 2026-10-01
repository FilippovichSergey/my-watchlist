"use client";

import { useState } from "react";
import { useT } from "../providers";
import { createEntry, searchTmdb } from "@/lib/api";
import { titleKey, type Category, type Entry, type TmdbTitle } from "@/lib/types";
import { SearchResults } from "./SearchResults";
import { CategoryPicker, RatingSelect } from "./RatingSelect";

export function AddEntryForm({ onAdded, onError }: { onAdded: (entry: Entry) => void; onError: (err: unknown) => void }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbTitle[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<TmdbTitle | null>(null);
  const [category, setCategory] = useState<Category>("MOVIE");
  const [myRating, setMyRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      setResults(await searchTmdb(q));
    } catch (err) {
      onError(err);
    } finally {
      setSearching(false);
    }
  }

  function handleSelect(result: TmdbTitle) {
    setSelected(result);
    // Sensible default; anime has to be picked by hand
    setCategory(result.mediaType === "MOVIE" ? "MOVIE" : "SERIAL");
  }

  async function handleAdd() {
    if (!selected) return;
    setSaving(true);
    try {
      onAdded(await createEntry({ tmdbId: selected.id, mediaType: selected.mediaType, category, myRating, review: review.trim() || null }));
      setSelected(null);
      setResults([]);
      setQuery("");
      setMyRating(null);
      setReview("");
    } catch (err) {
      onError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 flex flex-col gap-4">
      <h2 className="font-medium">{t("admin.addEntry")}</h2>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={t("admin.searchPlaceholder")}
          value={query}
          maxLength={100}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm rounded-lg hover:opacity-80 disabled:opacity-50"
        >
          {searching ? "..." : t("admin.search")}
        </button>
      </div>

      <SearchResults results={results} selectedKey={selected ? titleKey(selected) : null} onSelect={handleSelect} />

      {selected && (
        <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
          <p className="text-sm font-medium">
            {t("admin.selected")}: <span className="text-blue-600">{selected.title}</span>
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <CategoryPicker value={category} onChange={setCategory} />
            <RatingSelect value={myRating} onChange={setMyRating} />
          </div>
          <textarea
            placeholder={t("admin.reviewPlaceholder")}
            value={review}
            maxLength={2000}
            onChange={(e) => setReview(e.target.value)}
            rows={3}
            className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent resize-none"
          />
          <button
            onClick={handleAdd}
            disabled={saving}
            className="self-start px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? t("admin.saving") : t("admin.add")}
          </button>
        </div>
      )}
    </section>
  );
}
