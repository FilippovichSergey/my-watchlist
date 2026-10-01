package com.watchlist.service;

import com.watchlist.config.TmdbProperties;
import com.watchlist.dto.EntryRequest;
import com.watchlist.dto.EntryResponse;
import com.watchlist.dto.TmdbTitle;
import com.watchlist.model.Entry;
import com.watchlist.repository.EntryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class EntryService {

    private final EntryRepository repository;
    private final TmdbService tmdb;
    private final String imageBaseUrl;

    public EntryService(EntryRepository repository, TmdbService tmdb, TmdbProperties props) {
        this.repository = repository;
        this.tmdb = tmdb;
        this.imageBaseUrl = props.imageBaseUrl();
    }

    /** @param includeReview personal notes are only for the admin; the public list gets null */
    public List<EntryResponse> findAll(boolean includeReview) {
        return repository.findAllByOrderByCreatedAtDesc().stream()
                .map(e -> toResponse(e, includeReview))
                .toList();
    }

    /** Title, poster and rating come from TMDB itself, so the client cannot store made-up metadata. */
    public EntryResponse create(EntryRequest request) {
        if (repository.existsByMediaTypeAndTmdbId(request.mediaType(), request.tmdbId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This title is already in the list");
        }
        TmdbTitle tmdbTitle = tmdb.details(request.mediaType(), request.tmdbId());

        Entry entry = new Entry();
        entry.setTmdbId(request.tmdbId());
        entry.setMediaType(request.mediaType());
        entry.setCategory(request.category());
        entry.setTitle(tmdbTitle.title());
        entry.setPosterPath(tmdbTitle.posterPath());
        entry.setTmdbRating(tmdbTitle.voteAverage());
        entry.setReview(StringUtils.hasText(request.review()) ? request.review().trim() : null);
        return toResponse(repository.save(entry), true);
    }

    public void delete(long id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Entry not found");
        }
        repository.deleteById(id);
    }

    private EntryResponse toResponse(Entry e, boolean includeReview) {
        String posterUrl = e.getPosterPath() != null ? imageBaseUrl + e.getPosterPath() : null;
        return new EntryResponse(e.getId(), e.getTmdbId(), e.getMediaType(), e.getTitle(), e.getCategory(),
                posterUrl, e.getTmdbRating(), includeReview ? e.getReview() : null, e.getCreatedAt());
    }
}
