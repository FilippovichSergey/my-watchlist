package com.watchlist.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "entry", uniqueConstraints = @UniqueConstraint(
        name = "uq_entry_media_type_tmdb_id", columnNames = {"media_type", "tmdb_id"}))
@Getter
@Setter
@NoArgsConstructor
public class Entry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer tmdbId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private TmdbMediaType mediaType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private Category category;

    @Column(nullable = false)
    private String title;

    private String originalTitle;

    private Integer releaseYear;

    /** Comma-separated ISO 3166-1 codes, e.g. "KR" or "JP,US"; names are localised by the frontend. */
    @Column(length = 64)
    private String countries;

    /** Comma-separated TMDB genre ids; names are localised by the frontend. */
    @Column(length = 128)
    private String genreIds;

    /** Comma-separated names of the leading cast, as TMDB spells them. */
    @Column(length = 512)
    private String castNames;

    @Column(columnDefinition = "TEXT")
    private String overview;

    /** TMDB poster path such as "/abc.jpg"; the image base URL is applied when responding. */
    private String posterPath;

    @Column(precision = 3, scale = 1)
    private BigDecimal tmdbRating;

    /** The owner's own score, 1-10. */
    private Integer myRating;

    /** The owner's short feedback, shown publicly. */
    @Column(length = 2000)
    private String review;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
