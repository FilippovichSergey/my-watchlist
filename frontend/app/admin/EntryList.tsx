"use client";

import Image from "next/image";
import { useState } from "react";
import { useLocale, useT } from "../providers";
import { categoryName } from "@/lib/catalog";
import type { Category, Entry, UpdateEntryInput } from "@/lib/types";
import { CategoryPicker, RatingSelect } from "./RatingSelect";

export function EntryList({
  entries,
  refreshing,
  onUpdate,
  onRefresh,
  onRefreshAll,
  onDelete,
}: {
  entries: Entry[];
  refreshing: boolean;
  onUpdate: (id: number, input: UpdateEntryInput) => Promise<boolean>;
  onRefresh: (id: number) => Promise<void>;
  onRefreshAll: () => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const t = useT();
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{t("admin.yourEntries", { n: entries.length })}</h2>
        <button
          onClick={onRefreshAll}
          disabled={refreshing || entries.length === 0}
          className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50"
        >
          {refreshing ? t("admin.refreshing") : t("admin.refreshAll")}
        </button>
      </div>
      {entries.map((entry) => (
        <EntryRow key={entry.id} entry={entry} onUpdate={onUpdate} onRefresh={onRefresh} onDelete={onDelete} />
      ))}
    </section>
  );
}

function EntryRow({
  entry,
  onUpdate,
  onRefresh,
  onDelete,
}: {
  entry: Entry;
  onUpdate: (id: number, input: UpdateEntryInput) => Promise<boolean>;
  onRefresh: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const t = useT();
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [category, setCategory] = useState<Category>(entry.category);
  const [myRating, setMyRating] = useState<number | null>(entry.myRating);
  const [review, setReview] = useState(entry.review ?? "");
  const [titleBe, setTitleBe] = useState(entry.titleBe ?? "");
  const [overviewBe, setOverviewBe] = useState(entry.overviewBe ?? "");
  const [busy, setBusy] = useState(false);
  const field = "border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-transparent";
  const action = "text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50";

  function startEditing() {
    setCategory(entry.category);
    setMyRating(entry.myRating);
    setReview(entry.review ?? "");
    setTitleBe(entry.titleBe ?? "");
    setOverviewBe(entry.overviewBe ?? "");
    setEditing(true);
  }

  async function save() {
    setBusy(true);
    const ok = await onUpdate(entry.id, {
      category,
      myRating,
      review: review.trim() || null,
      titleBe: titleBe.trim() || null,
      overviewBe: overviewBe.trim() || null,
    });
    setBusy(false);
    if (ok) setEditing(false);
  }

  async function refresh() {
    setBusy(true);
    await onRefresh(entry.id);
    setBusy(false);
  }

  return (
    <div className="flex gap-3 items-start border border-gray-200 dark:border-gray-800 rounded-lg p-3">
      {entry.posterUrl && (
        <Image src={entry.posterUrl} alt={entry.title} width={40} height={60} className="rounded object-cover flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <p className="text-sm font-medium truncate">
          {entry.title}
          {entry.releaseYear && <span className="text-gray-500 font-normal"> ({entry.releaseYear})</span>}
        </p>
        {editing ? (
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex flex-wrap items-center gap-4">
              <CategoryPicker value={category} onChange={setCategory} />
              <RatingSelect value={myRating} onChange={setMyRating} />
            </div>
            <input
              type="text"
              value={titleBe}
              maxLength={255}
              onChange={(e) => setTitleBe(e.target.value)}
              placeholder={t("admin.titleBe")}
              aria-label={t("admin.titleBe")}
              className={field}
            />
            <textarea
              value={overviewBe}
              maxLength={4000}
              onChange={(e) => setOverviewBe(e.target.value)}
              placeholder={t("admin.overviewBe")}
              aria-label={t("admin.overviewBe")}
              rows={4}
              className={`${field} resize-none`}
            />
            <textarea
              value={review}
              maxLength={2000}
              onChange={(e) => setReview(e.target.value)}
              placeholder={t("admin.reviewPlaceholder")}
              aria-label={t("admin.reviewPlaceholder")}
              rows={3}
              className={`${field} resize-none`}
            />
            <div className="flex gap-3">
              <button onClick={save} disabled={busy} className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {busy ? t("admin.saving") : t("admin.save")}
              </button>
              <button onClick={() => setEditing(false)} disabled={busy} className={action}>
                {t("admin.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className={`text-xs ${entry.titleBe ? "text-gray-600 dark:text-gray-400" : "italic text-gray-400"}`}>
              {entry.titleBe ?? t("admin.noTitleBe")}
            </p>
            <p className="text-xs text-gray-500">
              {categoryName(entry.category, locale)}
              {entry.myRating != null && ` · ★ ${entry.myRating}`}
              {entry.tmdbRating != null && ` · TMDB ${entry.tmdbRating.toFixed(1)}`}
            </p>
            {entry.review && <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line">{entry.review}</p>}
          </>
        )}
      </div>
      {!editing && (
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <button onClick={startEditing} className={action}>{t("admin.edit")}</button>
          <button onClick={refresh} disabled={busy} className={action}>{busy ? t("admin.refreshing") : t("admin.refresh")}</button>
          <button onClick={() => onDelete(entry.id)} className="text-xs text-red-500 hover:text-red-700">{t("admin.remove")}</button>
        </div>
      )}
    </div>
  );
}
