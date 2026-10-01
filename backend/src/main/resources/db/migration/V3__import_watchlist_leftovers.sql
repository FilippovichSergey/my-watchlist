-- Three titles from the owner's list that needed the original Japanese names to be found (2026-10-01).
-- created_at is placed just after each title's neighbour from V2, so the list keeps its original order.
INSERT INTO entry (tmdb_id, media_type, category, title, poster_path, tmdb_rating, created_at)
SELECT 1124341, 'MOVIE', 'MOVIE', 'SEE HEAR LOVE', '/48cBIyEIAWd26gsGYwL8tjKWv14.jpg', 7.8,
       COALESCE((SELECT created_at FROM entry WHERE media_type = 'MOVIE' AND tmdb_id = 1450), NOW()) - INTERVAL '30 seconds'
ON CONFLICT (media_type, tmdb_id) DO NOTHING;
INSERT INTO entry (tmdb_id, media_type, category, title, poster_path, tmdb_rating, created_at)
SELECT 155168, 'TV', 'SERIAL', 'The Sealer', '/zs80wsw7HskYsBUp5rDelKp9p2L.jpg', 8.0,
       COALESCE((SELECT created_at FROM entry WHERE media_type = 'TV' AND tmdb_id = 256381), NOW()) - INTERVAL '30 seconds'
ON CONFLICT (media_type, tmdb_id) DO NOTHING;
INSERT INTO entry (tmdb_id, media_type, category, title, poster_path, tmdb_rating, created_at)
SELECT 64038, 'TV', 'SERIAL', 'Koinaka', '/oXv5nPtPY8Fj7ax8YyGLclHgMH.jpg', 6.6,
       COALESCE((SELECT created_at FROM entry WHERE media_type = 'TV' AND tmdb_id = 317415), NOW()) - INTERVAL '30 seconds'
ON CONFLICT (media_type, tmdb_id) DO NOTHING;
