package com.watchlist.model;

import java.util.Optional;

/** TMDB keeps separate id spaces for movies and TV shows; the pair (mediaType, tmdbId) identifies a title. */
public enum TmdbMediaType {
    MOVIE("movie"),
    TV("tv");

    private final String tmdbName;

    TmdbMediaType(String tmdbName) {
        this.tmdbName = tmdbName;
    }

    /** Path segment and media_type value used by the TMDB API. */
    public String tmdbName() {
        return tmdbName;
    }

    public static Optional<TmdbMediaType> fromTmdbName(String name) {
        for (TmdbMediaType type : values()) {
            if (type.tmdbName.equals(name)) {
                return Optional.of(type);
            }
        }
        return Optional.empty();
    }
}
