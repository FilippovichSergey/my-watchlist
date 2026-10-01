import Image from "next/image";
import type { Entry } from "@/lib/types";

export function EntryList({ entries, onDelete }: { entries: Entry[]; onDelete: (id: number) => void }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium">Your entries ({entries.length})</h2>
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex gap-3 items-start border border-gray-200 dark:border-gray-800 rounded-lg p-3"
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
            {entry.review && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-line">{entry.review}</p>
            )}
          </div>
          <button
            onClick={() => onDelete(entry.id)}
            className="text-xs text-red-500 hover:text-red-700 flex-shrink-0"
          >
            Remove
          </button>
        </div>
      ))}
    </section>
  );
}
