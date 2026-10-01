CREATE TABLE entry (
    id          BIGSERIAL     PRIMARY KEY,
    -- TMDB numbers movies and TV shows independently, so the pair identifies a title
    tmdb_id     INTEGER       NOT NULL CHECK (tmdb_id > 0),
    media_type  VARCHAR(8)    NOT NULL CHECK (media_type IN ('MOVIE', 'TV')),
    category    VARCHAR(8)    NOT NULL CHECK (category IN ('MOVIE', 'ANIME', 'SERIAL')),
    title       VARCHAR(255)  NOT NULL,
    poster_path VARCHAR(255),
    tmdb_rating NUMERIC(3, 1) CHECK (tmdb_rating BETWEEN 0 AND 10),
    review      VARCHAR(2000),
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_entry_media_type_tmdb_id UNIQUE (media_type, tmdb_id)
);
