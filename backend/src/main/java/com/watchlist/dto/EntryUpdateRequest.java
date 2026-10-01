package com.watchlist.dto;

import com.watchlist.model.Category;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** The owner-editable part of an entry; TMDB facts are refreshed separately. */
public record EntryUpdateRequest(
        @NotNull Category category,
        @Min(1) @Max(10) Integer myRating,
        @Size(max = 2000) String review,
        @Size(max = 255) String titleBe,
        @Size(max = 4000) String overviewBe) {}
