import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPublicEntry } from "@/lib/backend";
import { getLocale } from "@/lib/locale.server";
import { t } from "@/lib/i18n";
import { categoryName, countryName, genreName } from "@/lib/catalog";

type Props = { params: Promise<{ id: string }> };

async function load(params: Props["params"]) {
  const { id } = await params;
  return /^\d+$/.test(id) ? fetchPublicEntry(Number(id)) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const entry = await load(params);
  return { title: entry ? `${entry.title} — My Watchlist` : "My Watchlist" };
}

export default async function TitlePage({ params }: Props) {
  const [entry, locale] = await Promise.all([load(params), getLocale()]);
  if (!entry) notFound();

  const facts: [string, string][] = [];
  if (entry.releaseYear) facts.push([t(locale, "detail.year"), String(entry.releaseYear)]);
  if (entry.countries.length) facts.push([t(locale, "detail.country"), entry.countries.map((c) => countryName(c, locale)).join(", ")]);
  if (entry.genreIds.length) facts.push([t(locale, "detail.genre"), entry.genreIds.map((g) => genreName(g, locale)).join(", ")]);
  if (entry.cast.length) facts.push([t(locale, "detail.cast"), entry.cast.join(", ")]);
  if (entry.tmdbRating != null) facts.push([t(locale, "detail.tmdbRating"), entry.tmdbRating.toFixed(1)]);
  if (entry.myRating != null) facts.push([t(locale, "detail.myRating"), `★ ${entry.myRating} / 10`]);

  return (
    <article className="card flex flex-col gap-6 p-5 desk:p-8">
      <Link href="/" className="text-sm text-muted transition-colors duration-150 hover:text-accent">
        {t(locale, "detail.back")}
      </Link>
      <div className="flex flex-col sm:flex-row gap-8">
        <div className="relative w-full sm:w-64 aspect-[2/3] shrink-0 rounded-xl overflow-hidden bg-subtle">
          {entry.posterUrl && (
            <Image src={entry.posterUrl} alt={entry.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 256px" priority />
          )}
        </div>
        <div className="flex flex-col gap-4 min-w-0">
          <div>
            <h1 className="font-display text-3xl font-semibold leading-tight">{entry.title}</h1>
            {entry.originalTitle && entry.originalTitle !== entry.title && (
              <p className="text-muted mt-1">
                <span className="label-caps mr-2">{t(locale, "detail.originalTitle")}</span>
                {entry.originalTitle}
              </p>
            )}
            <p className="text-sm text-muted mt-1">{categoryName(entry.category, locale)}</p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {facts.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {entry.overview && (
            <section>
              <h2 className="label-caps mb-1">{t(locale, "detail.overview")}</h2>
              <p className="text-sm leading-relaxed">{entry.overview}</p>
            </section>
          )}
          {entry.review && (
            <section className="border-l-2 border-accent pl-4">
              <h2 className="label-caps mb-1">{t(locale, "detail.myFeedback")}</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line">{entry.review}</p>
            </section>
          )}
        </div>
      </div>
    </article>
  );
}
