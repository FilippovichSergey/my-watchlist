package com.watchlist.dto;

import com.watchlist.model.Category;
import com.watchlist.model.TmdbMediaType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * @param countries ISO 3166-1 codes, localised by the frontend
 * @param genreIds TMDB genre ids, localised by the frontend
 * @param cast leading cast as TMDB spells the names
 * @param myRating the owner's 1-10 score
 * @param review the owner's feedback
 * @param titleBe the owner's Belarusian title, null until entered
 * @param overviewBe the owner's Belarusian description, null until entered
 */
public record EntryResponse(
        Long id,
        Integer tmdbId,
        TmdbMediaType mediaType,
        String title,
        String originalTitle,
        Category category,
        Integer releaseYear,
        List<String> countries,
        List<Integer> genreIds,
        List<String> cast,
        String overview,
        String posterUrl,
        BigDecimal tmdbRating,
        Integer myRating,
        String review,
        String titleBe,
        String overviewBe,
        OffsetDateTime createdAt) {}
