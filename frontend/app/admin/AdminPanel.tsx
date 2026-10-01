"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useT } from "../providers";
import { ApiError, deleteEntry, fetchAdminEntries, refreshAllEntries, refreshEntry, updateEntry } from "@/lib/api";
import type { Entry, UpdateEntryInput } from "@/lib/types";
import { AddEntryForm } from "./AddEntryForm";
import { EntryList } from "./EntryList";

export function AdminPanel({
  onSessionExpired,
  account,
}: {
  onSessionExpired: () => void;
  account: { email: string | null; id: string | null };
}) {
  const t = useT();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
      setError(t("admin.genericError"));
    },
    [onSessionExpired, t]
  );

  useEffect(() => {
    fetchAdminEntries().then(setEntries).catch(handleError);
  }, [handleError]);

  const replace = (updated: Entry) => setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));

  async function handleUpdate(id: number, input: UpdateEntryInput): Promise<boolean> {
    setError(null);
    try {
      replace(await updateEntry(id, input));
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  }

  async function handleRefresh(id: number) {
    setError(null);
    try {
      replace(await refreshEntry(id));
    } catch (err) {
      handleError(err);
    }
  }

  async function handleRefreshAll() {
    setRefreshing(true);
    setError(null);
    setNotice(null);
    try {
      const { refreshed } = await refreshAllEntries();
      setEntries(await fetchAdminEntries());
      setNotice(t("admin.refreshed", { n: refreshed }));
    } catch (err) {
      handleError(err);
    } finally {
      setRefreshing(false);
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
          <h1 className="text-2xl font-semibold">{t("admin.title")}</h1>
          <button onClick={() => signOut({ redirectTo: "/" })} className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">
            {t("admin.signOut")}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          {t("admin.signedInAs", { email: account.email ?? "?" })}
          {account.id && <> · {t("admin.accountIdHint", { id: account.id })}</>}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-green-700 border border-green-200 dark:border-green-900 rounded-lg px-3 py-2">
          {notice}
        </p>
      )}

      <AddEntryForm
        onAdded={(entry) => {
          setError(null);
          setEntries((prev) => [entry, ...prev]);
        }}
        onError={handleError}
      />

      <EntryList
        entries={entries}
        refreshing={refreshing}
        onUpdate={handleUpdate}
        onRefresh={handleRefresh}
        onRefreshAll={handleRefreshAll}
        onDelete={handleDelete}
      />
    </div>
  );
}
