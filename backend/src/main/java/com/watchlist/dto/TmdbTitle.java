package com.watchlist.dto;

import com.watchlist.model.TmdbMediaType;

import java.math.BigDecimal;

/** A movie or TV show as TMDB describes it. */
public record TmdbTitle(
        int id,
        TmdbMediaType mediaType,
        String title,
        String posterPath,
        String posterUrl,
        BigDecimal voteAverage,
        String overview) {}
