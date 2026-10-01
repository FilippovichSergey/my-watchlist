-- The owner's own Belarusian title and description, entered in the admin page.
-- Nullable: TMDB carries no Belarusian translations for this list, so there is nothing to import.
ALTER TABLE entry
    ADD COLUMN title_be    VARCHAR(255),
    ADD COLUMN overview_be TEXT;
