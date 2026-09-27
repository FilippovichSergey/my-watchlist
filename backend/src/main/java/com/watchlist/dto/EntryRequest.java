package com.watchlist.dto;

import com.watchlist.model.Category;
import java.math.BigDecimal;

public record EntryRequest(
        Integer tmdbId,
        String title,
        Category category,
        String posterUrl,
        BigDecimal tmdbRating,
        String review
) {}
