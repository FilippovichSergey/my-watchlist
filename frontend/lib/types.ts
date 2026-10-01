export type Category = "MOVIE" | "ANIME" | "SERIAL";
export type TmdbMediaType = "MOVIE" | "TV";
export const CATEGORIES: Category[] = ["MOVIE", "ANIME", "SERIAL"];

export interface Entry {
  id: number;
  tmdbId: number;
  mediaType: TmdbMediaType;
  title: string;
  originalTitle: string | null;
  category: Category;
  releaseYear: number | null;
  /** ISO 3166-1 codes; names are localised in the UI. */
  countries: string[];
  /** TMDB genre ids; names are localised in the UI. */
  genreIds: number[];
  /** Leading cast as TMDB spells the names. */
  cast: string[];
  overview: string | null;
  posterUrl: string | null;
  tmdbRating: number | null;
  /** The owner's 1-10 score. */
  myRating: number | null;
  /** The owner's feedback, shown publicly. */
  review: string | null;
  createdAt: string;
}

export interface TmdbTitle {
  id: number;
  mediaType: TmdbMediaType;
  title: string;
  originalTitle: string | null;
  year: number | null;
  posterPath: string | null;
  posterUrl: string | null;
  voteAverage: number | null;
  overview: string | null;
}

/** The backend fetches title, poster, rating and facts from TMDB itself. */
export interface CreateEntryInput {
  tmdbId: number;
  mediaType: TmdbMediaType;
  category: Category;
  myRating: number | null;
  review: string | null;
}

export interface UpdateEntryInput {
  category: Category;
  myRating: number | null;
  review: string | null;
}

/** State of the background "refresh all" job on the backend; there is at most one run at a time. */
export interface RefreshProgress {
  running: boolean;
  total: number;
  done: number;
  failed: number;
  startedAt: string | null;
  finishedAt: string | null;
}

/** TMDB ids repeat between movies and TV, so keys need the media type too. */
export const titleKey = (t: { mediaType: TmdbMediaType; id: number }) => `${t.mediaType}-${t.id}`;
