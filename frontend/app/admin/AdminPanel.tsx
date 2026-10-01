"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { ApiError, createEntry, deleteEntry, fetchAdminEntries, searchTmdb } from "@/lib/api";
import { titleKey, type Category, type Entry, type TmdbTitle } from "@/lib/types";
import { SearchResults } from "./SearchResults";
import { EntryList } from "./EntryList";

const CATEGORIES: { label: string; value: Category }[] = [
  { label: "Movie", value: "MOVIE" },
  { label: "Anime", value: "ANIME" },
  { label: "Serial", value: "SERIAL" },
];

export function AdminPanel({
  onSessionExpired,
  account,
}: {
  onSessionExpired: () => void;
  account: { email: string | null; id: string | null };
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbTitle[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<TmdbTitle | null>(null);
  const [category, setCategory] = useState<Category>("MOVIE");
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }
      if (err instanceof ApiError) {
        const details = err.fieldErrors.map((e) => `${e.field}: ${e.message}`).join("; ");
        setError(details ? `${err.message} (${details})` : err.message);
        return;
      }
      setError("Something went wrong. Please try again.");
    },
    [onSessionExpired]
  );

  useEffect(() => {
    fetchAdminEntries().then(setEntries).catch(handleError);
  }, [handleError]);

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    try {
      setResults(await searchTmdb(q));
    } catch (err) {
      handleError(err);
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
    setError(null);
    try {
      const entry = await createEntry({
        tmdbId: selected.id,
        mediaType: selected.mediaType,
        category,
        review: review.trim() || null,
      });
      setEntries((prev) => [entry, ...prev]);
      setSelected(null);
      setResults([]);
      setQuery("");
      setReview("");
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    try {
      await deleteEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      handleError(err);
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin</h1>
          <button
            onClick={() => signOut({ redirectTo: "/" })}
            className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Sign out
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Signed in as {account.email ?? "unknown"}
          {account.id && (
            <>
              {" · "}Google account id <code className="select-all">{account.id}</code> — put it into{" "}
              <code>ADMIN_GOOGLE_SUBS</code> so access no longer depends on the e-mail address.
            </>
          )}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <section className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 flex flex-col gap-4">
        <h2 className="font-medium">Add entry</h2>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search title on TMDB..."
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
            {searching ? "..." : "Search"}
          </button>
        </div>

        <SearchResults results={results} selectedKey={selected ? titleKey(selected) : null} onSelect={handleSelect} />

        {selected && (
          <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
            <p className="text-sm font-medium">
              Selected: <span className="text-blue-600">{selected.title}</span>
            </p>
            <div className="flex gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`px-3 py-1 text-sm rounded-full border ${
                    category === c.value
                      ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900"
                      : "border-gray-300 dark:border-gray-700"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Short review (optional, private)"
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
              {saving ? "Saving..." : "Add to watchlist"}
            </button>
          </div>
        )}
      </section>

      <EntryList entries={entries} onDelete={handleDelete} />
    </div>
  );
}
