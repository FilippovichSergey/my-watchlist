package com.watchlist.dto;

import com.watchlist.model.Category;
import com.watchlist.model.TmdbMediaType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** What the admin chooses. Title, poster and rating are looked up on TMDB server-side, not trusted from the client. */
public record EntryRequest(
        @NotNull @Positive Integer tmdbId,
        @NotNull TmdbMediaType mediaType,
        @NotNull Category category,
        @Size(max = 2000) String review) {}
