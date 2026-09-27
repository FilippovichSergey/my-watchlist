package com.watchlist.dto;

import com.watchlist.model.Category;
import com.watchlist.model.Entry;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record EntryResponse(
        Long id,
        Integer tmdbId,
        String title,
        Category category,
        String posterUrl,
        BigDecimal tmdbRating,
        String review,
        OffsetDateTime createdAt
) {
    public static EntryResponse from(Entry e) {
        return new EntryResponse(
                e.getId(), e.getTmdbId(), e.getTitle(), e.getCategory(),
                e.getPosterUrl(), e.getTmdbRating(), e.getReview(), e.getCreatedAt()
        );
    }
}
