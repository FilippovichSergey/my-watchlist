import { getSession } from "next-auth/react";
import type { CreateEntryInput, Entry, TmdbTitle } from "./types";

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fieldErrors: FieldError[] = []
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Calls the same-origin admin routes. On 401 the Auth.js session is refreshed
 * (which renews the Google token server-side) and the call is retried once.
 */
async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await fetch(path, { ...init, cache: "no-store" });
  if (res.status === 401) {
    await getSession();
    res = await fetch(path, { ...init, cache: "no-store" });
  }
  if (!res.ok) throw await toApiError(res);
  return res.status === 204 ? (undefined as T) : res.json();
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: { detail?: string; errors?: FieldError[] } | null = null;
  try {
    body = await res.json();
  } catch {
    // not a JSON problem response
  }
  const message =
    res.status === 401
      ? "Your session has expired. Please sign in again."
      : res.status === 403
        ? "This account is not allowed to modify the list."
        : body?.detail ?? `Request failed (${res.status})`;
  return new ApiError(res.status, message, body?.errors ?? []);
}

export const fetchAdminEntries = () => adminRequest<Entry[]>("/api/entries");

export const searchTmdb = (q: string) =>
  adminRequest<TmdbTitle[]>(`/api/tmdb/search?q=${encodeURIComponent(q)}`);

export const createEntry = (input: CreateEntryInput) =>
  adminRequest<Entry>("/api/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

export const deleteEntry = (id: number) => adminRequest<void>(`/api/entries/${id}`, { method: "DELETE" });
