"use client";

import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import {
  fetchEntries,
  searchTmdb,
  createEntry,
  deleteEntry,
  type Category,
  type Entry,
  type TmdbResult,
} from "@/lib/api";

const CATEGORIES: { label: string; value: Category }[] = [
  { label: "Movie", value: "MOVIE" },
  { label: "Anime", value: "ANIME" },
  { label: "Serial", value: "SERIAL" },
];

export default function AdminPage() {
  const { data: session, status } = useSession();

  if (status === "loading") return <p className="text-gray-500">Loading...</p>;
  if (!session) {
    return (
      <div className="flex flex-col items-center gap-4 mt-20">
        <p className="text-gray-600 dark:text-gray-400">Sign in to manage your watchlist.</p>
        <button
          onClick={() => signIn("google")}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return <AdminPanel session={session} />;
}

function AdminPanel({ session }: { session: any }) {
  const idToken: string = (session as any).idToken ?? "";

  const [entries, setEntries] = useState<Entry[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [category, setCategory] = useState<Category>("MOVIE");
  const [review, setReview] = useState("");
  const [selected, setSelected] = useState<TmdbResult | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEntries().then(setEntries).catch(console.error);
  }, []);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      setResults(await searchTmdb(query, idToken));
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd() {
    if (!selected) return;
    setSaving(true);
    try {
      const entry = await createEntry(
        {
          tmdbId: selected.id,
          title: selected.title,
          category,
          posterUrl: selected.posterPath,
          tmdbRating: selected.voteAverage ?? null,
          review: review.trim() || null,
        },
        idToken
      );
      setEntries((prev) => [entry, ...prev]);
      setSelected(null);
      setResults([]);
      setQuery("");
      setReview("");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    await deleteEntry(id, idToken);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <button
          onClick={() => signOut()}
          className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
        >
          Sign out
        </button>
      </div>

      {/* Add entry */}
      <section className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 flex flex-col gap-4">
        <h2 className="font-medium">Add entry</h2>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search title on TMDB..."
            value={query}
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

        {results.length > 0 && (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            {results.map((r) => (
              <li
                key={r.id}
                onClick={() => setSelected(r)}
                className={`flex gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 ${
                  selected?.id === r.id ? "bg-blue-50 dark:bg-blue-950" : ""
                }`}
              >
                {r.posterPath && (
                  <Image
                    src={r.posterPath}
                    alt={r.title}
                    width={40}
                    height={60}
                    className="rounded object-cover flex-shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.title}</p>
                  <p className="text-xs text-gray-500 line-clamp-2">{r.overview}</p>
                  {r.voteAverage != null && (
                    <p className="text-xs text-yellow-600 mt-0.5">
                      TMDB {r.voteAverage.toFixed(1)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

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
              placeholder="Short review (optional)"
              value={review}
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

      {/* Existing entries */}
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Your entries ({entries.length})</h2>
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex gap-3 items-center border border-gray-200 dark:border-gray-800 rounded-lg p-3"
          >
            {entry.posterUrl && (
              <Image
                src={entry.posterUrl}
                alt={entry.title}
                width={40}
                height={60}
                className="rounded object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{entry.title}</p>
              <p className="text-xs text-gray-500">
                {entry.category.toLowerCase()}
                {entry.tmdbRating != null && ` · ${entry.tmdbRating.toFixed(1)}`}
              </p>
            </div>
            <button
              onClick={() => handleDelete(entry.id)}
              className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
            >
              Remove
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
