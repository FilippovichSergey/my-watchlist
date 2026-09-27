package com.watchlist.dto;

import java.math.BigDecimal;

public record TmdbSearchResult(
        Integer id,
        String title,
        String posterPath,
        BigDecimal voteAverage,
        String overview
) {}
