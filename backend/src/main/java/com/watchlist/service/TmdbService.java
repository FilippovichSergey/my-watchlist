package com.watchlist.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;
import com.watchlist.config.TmdbProperties;
import com.watchlist.dto.TmdbTitle;
import com.watchlist.model.TmdbMediaType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class TmdbService {

    private static final int MAX_RESULTS = 10;

    private final RestClient tmdb;
    private final String imageBaseUrl;

    public TmdbService(RestClient tmdbRestClient, TmdbProperties props) {
        this.tmdb = tmdbRestClient;
        this.imageBaseUrl = props.imageBaseUrl();
    }

    public List<TmdbTitle> search(String query) {
        SearchResponse response;
        try {
            response = tmdb.get()
                    .uri("/search/multi?query={q}&include_adult=false&language=en-US&page=1", query)
                    .retrieve()
                    .body(SearchResponse.class);
        } catch (RestClientException e) {
            throw upstreamFailure(e);
        }
        if (response == null || response.results() == null) {
            return List.of();
        }
        return response.results().stream()
                .filter(r -> TmdbMediaType.fromTmdbName(r.mediaType()).isPresent())
                .limit(MAX_RESULTS)
                .map(r -> toTitle(TmdbMediaType.fromTmdbName(r.mediaType()).orElseThrow(),
                        r.id(), r.title(), r.name(), r.posterPath(), r.voteAverage(), r.overview()))
                .toList();
    }

    /** Authoritative metadata for one title. Stored entries are built from this, never from client-supplied fields. */
    public TmdbTitle details(TmdbMediaType type, int tmdbId) {
        Details details;
        try {
            details = tmdb.get()
                    .uri("/{type}/{id}?language=en-US", type.tmdbName(), tmdbId)
                    .retrieve()
                    .body(Details.class);
        } catch (HttpClientErrorException.NotFound e) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "TMDB has no " + type.tmdbName() + " with id " + tmdbId);
        } catch (RestClientException e) {
            throw upstreamFailure(e);
        }
        if (details == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "TMDB returned an empty response");
        }
        return toTitle(type, details.id(), details.title(), details.name(),
                details.posterPath(), details.voteAverage(), details.overview());
    }

    private static ResponseStatusException upstreamFailure(RestClientException cause) {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, "TMDB request failed", cause);
    }

    private TmdbTitle toTitle(TmdbMediaType type, int id, String title, String name,
                              String posterPath, BigDecimal voteAverage, String overview) {
        // Movies carry "title", TV shows carry "name"
        String displayTitle = title != null ? title : name != null ? name : "Untitled";
        String posterUrl = posterPath != null ? imageBaseUrl + posterPath : null;
        // TMDB reports 0 for titles nobody has rated yet
        BigDecimal rating = voteAverage == null || voteAverage.signum() == 0
                ? null
                : voteAverage.setScale(1, RoundingMode.HALF_UP);
        return new TmdbTitle(id, type, displayTitle, posterPath, posterUrl, rating, overview);
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SearchResponse(List<SearchItem> results) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record SearchItem(int id, String mediaType, String title, String name,
                             String posterPath, BigDecimal voteAverage, String overview) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Details(int id, String title, String name,
                          String posterPath, BigDecimal voteAverage, String overview) {}
}
