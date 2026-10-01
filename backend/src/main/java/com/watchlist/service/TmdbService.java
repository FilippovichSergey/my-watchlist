package com.watchlist.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.watchlist.config.TmdbProperties;
import com.watchlist.dto.TmdbDetails;
import com.watchlist.dto.TmdbTitle;
import com.watchlist.model.TmdbMediaType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
public class TmdbService {

    private static final int MAX_RESULTS = 10;
    private static final int MAX_CAST = 6;

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
                .map(r -> new TmdbTitle(r.id(), TmdbMediaType.fromTmdbName(r.mediaType()).orElseThrow(),
                        displayTitle(r.title(), r.name()), original(r.originalTitle(), r.originalName()),
                        year(r.releaseDate(), r.firstAirDate()), r.posterPath(), posterUrl(r.posterPath()),
                        rating(r.voteAverage()), r.overview()))
                .toList();
    }

    /** Authoritative facts for one title (with its leading cast). Stored entries are built from this, never from client input. */
    public TmdbDetails details(TmdbMediaType type, int tmdbId) {
        Details d;
        try {
            d = tmdb.get()
                    .uri("/{type}/{id}?language=en-US&append_to_response=credits", type.tmdbName(), tmdbId)
                    .retrieve()
                    .body(Details.class);
        } catch (HttpClientErrorException.NotFound e) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "TMDB has no " + type.tmdbName() + " with id " + tmdbId);
        } catch (RestClientException e) {
            throw upstreamFailure(e);
        }
        if (d == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "TMDB returned an empty response");
        }
        // TV shows carry origin_country; movies production_countries (and, lately, origin_country too)
        List<String> countries = d.originCountry() != null && !d.originCountry().isEmpty()
                ? d.originCountry()
                : d.productionCountries() == null ? List.of()
                : d.productionCountries().stream().map(Country::code).filter(Objects::nonNull).toList();
        List<Integer> genreIds = d.genres() == null ? List.of() : d.genres().stream().map(Genre::id).toList();
        List<String> cast = d.credits() == null || d.credits().cast() == null ? List.of()
                : d.credits().cast().stream()
                        .filter(c -> c.name() != null)
                        .sorted(Comparator.comparing(c -> c.order() == null ? Integer.MAX_VALUE : c.order()))
                        .limit(MAX_CAST)
                        .map(CastMember::name)
                        .toList();
        return new TmdbDetails(d.id(), type, displayTitle(d.title(), d.name()), original(d.originalTitle(), d.originalName()),
                year(d.releaseDate(), d.firstAirDate()), countries, genreIds, cast,
                d.posterPath(), rating(d.voteAverage()), d.overview());
    }

    private static ResponseStatusException upstreamFailure(RestClientException cause) {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, "TMDB request failed", cause);
    }

    /** Movies carry "title", TV shows carry "name". */
    private static String displayTitle(String title, String name) {
        return title != null ? title : name != null ? name : "Untitled";
    }

    private static String original(String originalTitle, String originalName) {
        return originalTitle != null ? originalTitle : originalName;
    }

    private static Integer year(String releaseDate, String firstAirDate) {
        String date = releaseDate != null ? releaseDate : firstAirDate;
        return date != null && date.length() >= 4 && date.substring(0, 4).chars().allMatch(Character::isDigit)
                ? Integer.parseInt(date.substring(0, 4)) : null;
    }

    private String posterUrl(String posterPath) {
        return posterPath != null ? imageBaseUrl + posterPath : null;
    }

    /** TMDB reports 0 for titles nobody has rated yet. */
    private static BigDecimal rating(BigDecimal voteAverage) {
        return voteAverage == null || voteAverage.signum() == 0 ? null : voteAverage.setScale(1, RoundingMode.HALF_UP);
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SearchResponse(List<SearchItem> results) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record SearchItem(int id, String mediaType, String title, String name, String originalTitle, String originalName,
                             String releaseDate, String firstAirDate, String posterPath, BigDecimal voteAverage, String overview) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record Details(int id, String title, String name, String originalTitle, String originalName,
                          String releaseDate, String firstAirDate, List<String> originCountry,
                          List<Country> productionCountries, List<Genre> genres, Credits credits,
                          String posterPath, BigDecimal voteAverage, String overview) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Country(@JsonProperty("iso_3166_1") String code) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Genre(int id) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Credits(List<CastMember> cast) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CastMember(String name, Integer order) {}
}
