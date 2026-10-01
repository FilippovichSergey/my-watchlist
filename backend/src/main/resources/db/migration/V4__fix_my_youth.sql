-- The list's "Это юность (2025), 12 episodes" is My Youth (JTBC, 12 episodes), not Spring of Youth (SBS, 10 episodes).
-- Swap the row in place: the replacement inherits the old row's position; if the old row is already gone, append.
WITH old AS (
    DELETE FROM entry WHERE media_type = 'TV' AND tmdb_id = 280016 RETURNING created_at
)
INSERT INTO entry (tmdb_id, media_type, category, title, poster_path, tmdb_rating, created_at)
SELECT 262237, 'TV', 'SERIAL', 'My Youth', '/dSabZvHzuZnDrBMCR1YuVH2wEiS.jpg', 7.5,
       COALESCE((SELECT created_at FROM old), NOW())
ON CONFLICT (media_type, tmdb_id) DO NOTHING;
