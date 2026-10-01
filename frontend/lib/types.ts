export type Category = "MOVIE" | "ANIME" | "SERIAL";
export type TmdbMediaType = "MOVIE" | "TV";

export interface Entry {
  id: number;
  tmdbId: number;
  mediaType: TmdbMediaType;
  title: string;
  category: Category;
  posterUrl: string | null;
  tmdbRating: number | null;
  /** Personal notes; null in the public listing. */
  review: string | null;
  createdAt: string;
}

export interface TmdbTitle {
  id: number;
  mediaType: TmdbMediaType;
  title: string;
  posterPath: string | null;
  posterUrl: string | null;
  voteAverage: number | null;
  overview: string | null;
}

/** The backend fetches title, poster and rating from TMDB itself. */
export interface CreateEntryInput {
  tmdbId: number;
  mediaType: TmdbMediaType;
  category: Category;
  review: string | null;
}

/** TMDB ids repeat between movies and TV, so keys need the media type too. */
export const titleKey = (t: { mediaType: TmdbMediaType; id: number }) => `${t.mediaType}-${t.id}`;
