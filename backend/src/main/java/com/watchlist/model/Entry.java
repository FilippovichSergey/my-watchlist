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

    /** TMDB poster path such as "/abc.jpg"; the image base URL is applied when responding. */
    private String posterPath;

    @Column(precision = 3, scale = 1)
    private BigDecimal tmdbRating;

    @Column(length = 2000)
    private String review;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
