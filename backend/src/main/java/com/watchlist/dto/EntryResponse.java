package com.watchlist.dto;

import com.watchlist.model.Category;
import com.watchlist.model.TmdbMediaType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** @param review personal notes; null in the public listing */
public record EntryResponse(
        Long id,
        Integer tmdbId,
        TmdbMediaType mediaType,
        String title,
        Category category,
        String posterUrl,
        BigDecimal tmdbRating,
        String review,
        OffsetDateTime createdAt) {}
