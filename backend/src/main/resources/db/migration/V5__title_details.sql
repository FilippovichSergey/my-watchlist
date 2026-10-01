-- Richer title information shown publicly: TMDB facts plus the owner's own rating.
-- Nullable on purpose: rows imported earlier are filled by the admin's "refresh from TMDB" action.
ALTER TABLE entry
    ADD COLUMN original_title VARCHAR(255),
    ADD COLUMN release_year   INTEGER CHECK (release_year BETWEEN 1888 AND 2100),
    ADD COLUMN countries      VARCHAR(64),
    ADD COLUMN genre_ids      VARCHAR(128),
    ADD COLUMN cast_names     VARCHAR(512),
    ADD COLUMN overview       TEXT,
    ADD COLUMN my_rating      INTEGER CHECK (my_rating BETWEEN 1 AND 10);
