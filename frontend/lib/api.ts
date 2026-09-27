const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type Category = "MOVIE" | "ANIME" | "SERIAL";

export interface Entry {
  id: number;
  tmdbId: number;
  title: string;
  category: Category;
  posterUrl: string | null;
  tmdbRating: number | null;
  review: string | null;
  createdAt: string;
}

export interface TmdbResult {
  id: number;
  title: string;
  posterPath: string | null;
  voteAverage: number | null;
  overview: string;
}

export async function fetchEntries(): Promise<Entry[]> {
  const res = await fetch(`${API_BASE}/api/entries`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch entries");
  return res.json();
}

export async function searchTmdb(q: string, idToken: string): Promise<TmdbResult[]> {
  const res = await fetch(
    `${API_BASE}/api/tmdb/search?q=${encodeURIComponent(q)}`,
    { headers: { Authorization: `Bearer ${idToken}` } }
  );
  if (!res.ok) throw new Error("TMDB search failed");
  return res.json();
}

export async function createEntry(
  body: Omit<Entry, "id" | "createdAt">,
  idToken: string
): Promise<Entry> {
  const res = await fetch(`${API_BASE}/api/entries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to create entry");
  return res.json();
}

export async function deleteEntry(id: number, idToken: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/entries/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error("Failed to delete entry");
}
