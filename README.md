# My Watchlist

A personal watchlist app for movies, anime, and serials.

## Stack

- **Backend**: Spring Boot 3.5 (Java 24), PostgreSQL, Flyway, Spring Security + OAuth2 Resource Server
- **Frontend**: Next.js 15, NextAuth v5 (Google), Tailwind CSS
- **Data**: TMDB API for posters and ratings

## Local development

### Prerequisites

- Java 24 (Amazon Corretto) — Spring Boot 3.5, Lombok 1.18.38
- Maven
- Node.js 20+
- Docker Desktop

### 1. Start PostgreSQL

```bash
docker compose up postgres
```

### 2. Backend

Copy and fill in the env file:

```bash
cp backend/.env.example backend/.env
# Set TMDB_API_KEY
```

Run:

```bash
cd backend
mvn spring-boot:run
```

### 3. Frontend

```bash
cp frontend/.env.local.example frontend/.env.local
# Fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/entries | public | List all entries |
| POST | /api/entries | Google JWT | Add entry |
| DELETE | /api/entries/{id} | Google JWT | Remove entry |
| GET | /api/tmdb/search?q= | Google JWT | Search TMDB |

## Deployment

- Live site: https://my-watchlist-sf.vercel.app/
- Repo: https://github.com/FilippovichSergey/my-watchlist

- **Backend**: Railway (add PostgreSQL plugin, set env vars)
- **Frontend**: Vercel (set env vars in project settings)
