import Image from "next/image";
import { fetchEntries, type Category, type Entry } from "@/lib/api";

const CATEGORIES: { label: string; value: Category | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Movies", value: "MOVIE" },
  { label: "Anime", value: "ANIME" },
  { label: "Serials", value: "SERIAL" },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const entries = await fetchEntries();
  const filtered =
    !category || category === "ALL"
      ? entries
      : entries.filter((e) => e.category === category);

  return (
    <div>
      <div className="flex gap-2 mb-8">
        {CATEGORIES.map((c) => (
          <a
            key={c.value}
            href={`/?category=${c.value}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              (category ?? "ALL") === c.value
                ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white"
                : "border-gray-300 dark:border-gray-700 hover:border-gray-500"
            }`}
          >
            {c.label}
          </a>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-center mt-20">Nothing here yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function EntryCard({ entry }: { entry: Entry }) {
  return (
    <div className="group flex flex-col gap-2">
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
        {entry.posterUrl ? (
          <Image
            src={entry.posterUrl}
            alt={entry.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-xs text-center px-2">
            No poster
          </div>
        )}
        {entry.tmdbRating != null && (
          <div className="absolute top-2 right-2 bg-black/70 text-yellow-400 text-xs font-bold px-1.5 py-0.5 rounded">
            {entry.tmdbRating.toFixed(1)}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium leading-tight line-clamp-2">{entry.title}</p>
        <p className="text-xs text-gray-500 capitalize mt-0.5">
          {entry.category.toLowerCase()}
        </p>
      </div>
    </div>
  );
}
