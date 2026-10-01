package com.watchlist.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "tmdb")
public record TmdbProperties(
        String accessToken,
        String apiKey,
        @NotBlank String baseUrl,
        @NotBlank String imageBaseUrl,
        @Positive int rateLimitPerMinute) {}
