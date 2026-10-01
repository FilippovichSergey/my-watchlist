import Image from "next/image";
import { titleKey, type TmdbMediaType, type TmdbTitle } from "@/lib/types";

const MEDIA_LABEL: Record<TmdbMediaType, string> = { MOVIE: "Movie", TV: "TV series" };

export function SearchResults({
  results,
  selectedKey,
  onSelect,
}: {
  results: TmdbTitle[];
  selectedKey: string | null;
  onSelect: (result: TmdbTitle) => void;
}) {
  if (results.length === 0) return null;
  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      {results.map((r) => {
        const key = titleKey(r);
        return (
          <li
            key={key}
            onClick={() => onSelect(r)}
            className={`flex gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 ${
              selectedKey === key ? "bg-blue-50 dark:bg-blue-950" : ""
            }`}
          >
            {r.posterUrl && (
              <Image
                src={r.posterUrl}
                alt={r.title}
                width={40}
                height={60}
                className="rounded object-cover flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{r.title}</p>
              <p className="text-xs text-gray-500">
                {MEDIA_LABEL[r.mediaType]}
                {r.voteAverage != null && ` · TMDB ${r.voteAverage.toFixed(1)}`}
              </p>
              {r.overview && <p className="text-xs text-gray-500 line-clamp-2">{r.overview}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
