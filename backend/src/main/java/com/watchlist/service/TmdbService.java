package com.watchlist.service;

import com.watchlist.dto.TmdbSearchResult;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TmdbService {

    private final RestClient restClient;

    @Value("${tmdb.api-key}")
    private String apiKey;

    @Value("${tmdb.image-base-url}")
    private String imageBaseUrl;

    @SuppressWarnings("unchecked")
    public List<TmdbSearchResult> search(String query) {
        Map<String, Object> response = restClient.get()
                .uri("/search/multi?query={q}&api_key={key}&language=en-US&page=1", query, apiKey)
                .retrieve()
                .body(Map.class);

        if (response == null || !response.containsKey("results")) return List.of();

        List<Map<String, Object>> results = (List<Map<String, Object>>) response.get("results");
        return results.stream()
                .filter(r -> "movie".equals(r.get("media_type")) || "tv".equals(r.get("media_type")))
                .limit(10)
                .map(this::toResult)
                .toList();
    }

    @SuppressWarnings("unchecked")
    private TmdbSearchResult toResult(Map<String, Object> r) {
        String mediaType = (String) r.get("media_type");
        String title = "movie".equals(mediaType)
                ? (String) r.get("title")
                : (String) r.get("name");
        String posterPath = (String) r.get("poster_path");
        String posterUrl = posterPath != null ? imageBaseUrl + posterPath : null;
        Number vote = (Number) r.get("vote_average");
        BigDecimal rating = vote != null ? BigDecimal.valueOf(vote.doubleValue()) : null;
        return new TmdbSearchResult(
                (Integer) r.get("id"),
                title,
                posterUrl,
                rating,
                (String) r.get("overview")
        );
    }
}
