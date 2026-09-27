CREATE TYPE category AS ENUM ('MOVIE', 'ANIME', 'SERIAL');

CREATE TABLE entry (
    id         BIGSERIAL PRIMARY KEY,
    tmdb_id    INTEGER NOT NULL UNIQUE,
    title      VARCHAR(255) NOT NULL,
    category   category NOT NULL,
    poster_url VARCHAR(512),
    tmdb_rating NUMERIC(3, 1),
    review     TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
