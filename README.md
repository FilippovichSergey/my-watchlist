# My Watchlist

A personal watchlist of movies, anime and serials: a public poster grid plus a private admin page for the owner.

Live: https://my-watchlist-sf.vercel.app/ · Repo: https://github.com/FilippovichSergey/my-watchlist

## Stack

- **Backend** (`backend/`) — Spring Boot 3.5 on Java 21, PostgreSQL + Flyway, Spring Security resource server that validates Google ID tokens, TMDB client.
- **Frontend** (`frontend/`) — Next.js 15, Auth.js v5 (Google sign-in), Tailwind CSS.
- **Data** — TMDB supplies title, poster and rating. The backend looks them up itself; the admin only picks a search result and adds a private note.

## How access works

- `GET /api/entries` is public. The `review` field is omitted unless the caller is the admin.
- Everything else needs a Google ID token issued for *this* OAuth client (`aud` is checked) from an allowlisted account: by stable Google account id (`ADMIN_GOOGLE_SUBS`, preferred) or by verified e-mail (`ADMIN_EMAILS`, handy for the first sign-in — the admin page then shows your account id). Other Google accounts get 403.
- The browser never holds the Google token. The admin page calls Next.js route handlers (`/api/entries`, `/api/tmdb/search`), which read the token from the encrypted Auth.js cookie, forward it to the backend and renew it with the refresh token shortly before the ID token's own `exp`.
- The cookie-authenticated routes accept only `fetch()` calls from the app's own pages (Fetch Metadata must say `Sec-Fetch-Site: same-origin` and `Sec-Fetch-Dest: empty`; requests without these headers are refused too), so a cross-site navigation cannot spend the TMDB budget even on GET. Writes additionally need an exact `Origin` match — scheme, host and port, against `APP_ORIGIN` when set, otherwise the request's own origin (proxy headers trusted only on Vercel or with `AUTH_TRUST_HOST=true`) — plus `application/json` and at most 16 KiB of body. All of it is checked in that order after the session, so anonymous callers cannot make the server buffer large bodies.
- TMDB calls are budgeted per admin (30 per minute, shared by searches and the lookup on every create). The counter is in-process: the backend runs as one instance.

## Dependencies

Spring Boot is pinned to the last open-source 3.5 release (`3.5.16`, Spring Security 6.5.11); that line no longer receives security fixes, so moving to Spring Boot 4 is the next planned upgrade. Next.js follows the 15.5 patch line. Keep both current — the first review of this project found the previous versions behind vendor advisories.

## Local development

Prerequisites: JDK 21+ (a newer JDK such as 24 works, the build targets 21), Maven, Node.js 20+, Docker Desktop.

### 1. Configuration

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

- **TMDB** → Settings → API: put the *API Read Access Token* into `TMDB_ACCESS_TOKEN` (or the v3 key into `TMDB_API_KEY`).
- **Google Cloud Console** → OAuth 2.0 client of type *Web application*, redirect URI `http://localhost:3000/api/auth/callback/google`. The client ID goes into both files, the secret only into the frontend one.
- `ADMIN_EMAILS` — your Google account, in both files. After the first sign-in copy the account id shown on the admin page into `ADMIN_GOOGLE_SUBS` (both files); the e-mail entry can then be removed.
- `AUTH_SECRET` — `openssl rand -base64 32`.

Spring loads `backend/.env` by itself (`spring.config.import`), Next.js loads `frontend/.env.local`. Both files are gitignored; the `.example` files must stay free of real values.

If a port is taken on your machine, add `PORT=8081` to `backend/.env` and point `BACKEND_URL` in `frontend/.env.local` at it.

### 2. Database

```bash
docker compose up -d postgres
```

Listens on `127.0.0.1:5434` (5432 is usually taken by a local PostgreSQL install). Flyway creates the schema when the backend first starts.

### 3. Backend — http://localhost:8080

```bash
cd backend
mvn spring-boot:run
```

### 4. Frontend — http://localhost:3000

```bash
cd frontend
npm install
npm run dev
```

### Tests

`cd backend && mvn verify` runs the security, validation and TMDB client tests plus `DatabaseSchemaTest`, which starts a throwaway PostgreSQL (Testcontainers) and checks that the Flyway migrations and the JPA mapping agree. Without Docker it is skipped on a developer machine but never in CI (`CI=true`), and the workflow additionally fails if the surefire report shows it skipped. `cd frontend && npm test` covers the request guards of the admin routes and the Google token renewal. CI (`.github/workflows/ci.yml`) runs all of it, builds the backend Docker image and the frontend on every push.

Schema changes go into new `V2__...`, `V3__...` files; a migration that has run anywhere is never edited — not even its comments, because Flyway's checksum covers the whole file. `AppliedMigrationsUnchangedTest` pins the checksums of applied migrations and fails the build on any change.

## Seed data

`V2__import_watchlist.sql` and `V3__import_watchlist_leftovers.sql` carry the owner's initial list, and `V4__fix_my_youth.sql` corrects one match in place (162 titles resolved against TMDB on 2026-10-01: TMDB id, media type, category, English title, poster path, rating). They run like any migration, so a fresh database — local, CI or production — starts with the same list; rows that already exist are left alone (`ON CONFLICT DO NOTHING`). Later additions go through the admin page, not through migrations.

## API

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/entries` | public | `review` only for the admin |
| POST | `/api/entries` | admin | `{tmdbId, mediaType: MOVIE or TV, category: MOVIE / ANIME / SERIAL, review?}` — 409 if already listed, 422 if TMDB has no such title |
| DELETE | `/api/entries/{id}` | admin | 404 if missing |
| GET | `/api/tmdb/search?q=` | admin | 1–100 characters; shares the 30/min TMDB budget with create, then 429 |

Errors are RFC 9457 problem details; validation failures add an `errors[]` list of `{field, message}`.

## Deployment

**Backend → Railway** from `backend/Dockerfile`, with the PostgreSQL plugin. Variables:

```
DATABASE_URL=jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
TMDB_ACCESS_TOKEN=...
GOOGLE_CLIENT_ID=...
ADMIN_GOOGLE_SUBS=...   # or ADMIN_EMAILS=...
```

Railway sets `PORT` itself.

**Frontend → Vercel**: Root Directory `frontend`; variables `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ADMIN_GOOGLE_SUBS` (or `ADMIN_EMAILS`), `BACKEND_URL` (the Railway URL) and `APP_ORIGIN=https://my-watchlist-sf.vercel.app`, so the write guards compare against a fixed public origin. Add `https://<your-vercel-domain>/api/auth/callback/google` to the Google client's redirect URIs.
