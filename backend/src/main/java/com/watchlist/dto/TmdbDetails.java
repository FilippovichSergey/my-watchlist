package com.watchlist.dto;

import com.watchlist.model.TmdbMediaType;

import java.math.BigDecimal;
import java.util.List;

/** Everything the list stores about a title, as TMDB describes it. */
public record TmdbDetails(
        int id,
        TmdbMediaType mediaType,
        String title,
        String originalTitle,
        Integer year,
        List<String> countries,
        List<Integer> genreIds,
        List<String> cast,
        String posterPath,
        BigDecimal voteAverage,
        String overview) {}
