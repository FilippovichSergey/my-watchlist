package com.watchlist.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Getter @Setter @NoArgsConstructor
public class Entry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Integer tmdbId;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "category")
    private Category category;

    private String posterUrl;

    @Column(precision = 3, scale = 1)
    private BigDecimal tmdbRating;

    @Column(columnDefinition = "TEXT")
    private String review;

    @Column(nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
