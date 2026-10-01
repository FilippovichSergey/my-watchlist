package com.watchlist.service;

import com.watchlist.config.TmdbProperties;
import com.watchlist.dto.EntryRequest;
import com.watchlist.dto.EntryResponse;
import com.watchlist.dto.EntryUpdateRequest;
import com.watchlist.dto.TmdbDetails;
import com.watchlist.model.Entry;
import com.watchlist.repository.EntryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

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

    public List<EntryResponse> findAll() {
        return repository.findAllByOrderByCreatedAtDesc().stream().map(this::toResponse).toList();
    }

    public EntryResponse findOne(long id) {
        return toResponse(load(id));
    }

    /** Title, poster, rating and facts come from TMDB itself, so the client cannot store made-up metadata. */
    public EntryResponse create(EntryRequest request) {
        if (repository.existsByMediaTypeAndTmdbId(request.mediaType(), request.tmdbId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This title is already in the list");
        }
        Entry entry = new Entry();
        entry.setTmdbId(request.tmdbId());
        entry.setMediaType(request.mediaType());
        entry.setCategory(request.category());
        entry.setMyRating(request.myRating());
        entry.setReview(blankToNull(request.review()));
        applyFacts(entry, tmdb.details(request.mediaType(), request.tmdbId()));
        return toResponse(repository.save(entry));
    }

    /** The owner-editable part only: one statement over the owner's columns, TMDB facts are not written. */
    public EntryResponse update(long id, EntryUpdateRequest request) {
        int updated = repository.updateOwnerFields(id, request.category(), request.myRating(),
                blankToNull(request.review()), blankToNull(request.titleBe()), blankToNull(request.overviewBe()));
        if (updated == 0) {
            throw notFound();
        }
        return toResponse(load(id));
    }

    /**
     * Re-reads one title's facts from TMDB; {@link RefreshJob} does this for the whole list. The lookup can
     * take a while and nothing is held in the database during it; afterwards only the TMDB columns are
     * written, so what the owner saved in the meantime stays as saved.
     */
    public EntryResponse refresh(long id) {
        Entry entry = load(id);
        Entry facts = new Entry();
        applyFacts(facts, tmdb.details(entry.getMediaType(), entry.getTmdbId()));
        int updated = repository.updateFacts(id, facts.getTitle(), facts.getOriginalTitle(), facts.getReleaseYear(),
                facts.getCountries(), facts.getGenreIds(), facts.getCastNames(), facts.getOverview(),
                facts.getPosterPath(), facts.getTmdbRating());
        if (updated == 0) {
            throw notFound();
        }
        return toResponse(load(id));
    }

    public void delete(long id) {
        repository.deleteById(load(id).getId());
    }

    private Entry load(long id) {
        return repository.findById(id).orElseThrow(EntryService::notFound);
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Entry not found");
    }

    private static void applyFacts(Entry entry, TmdbDetails facts) {
        entry.setTitle(facts.title());
        entry.setOriginalTitle(facts.originalTitle());
        entry.setReleaseYear(facts.year());
        entry.setCountries(join(facts.countries(), 64));
        entry.setGenreIds(join(facts.genreIds().stream().map(String::valueOf).toList(), 128));
        entry.setCastNames(join(facts.cast(), 512));
        entry.setOverview(facts.overview());
        entry.setPosterPath(facts.posterPath());
        entry.setTmdbRating(facts.voteAverage());
    }

    /** Comma-separated, cut at the column size on a comma boundary. */
    private static String join(List<String> values, int maxLength) {
        if (values == null || values.isEmpty()) return null;
        String joined = String.join(",", values);
        while (joined.length() > maxLength && joined.contains(",")) {
            joined = joined.substring(0, joined.lastIndexOf(','));
        }
        return joined.length() > maxLength ? null : joined;
    }

    private static List<String> split(String csv) {
        return csv == null || csv.isBlank() ? List.of()
                : Arrays.stream(csv.split(",")).map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toList());
    }

    private static String blankToNull(String s) {
        return StringUtils.hasText(s) ? s.trim() : null;
    }

    private EntryResponse toResponse(Entry e) {
        String posterUrl = e.getPosterPath() != null ? imageBaseUrl + e.getPosterPath() : null;
        List<Integer> genreIds = split(e.getGenreIds()).stream()
                .filter(s -> s.chars().allMatch(Character::isDigit)).map(Integer::valueOf).toList();
        return new EntryResponse(e.getId(), e.getTmdbId(), e.getMediaType(), e.getTitle(), e.getOriginalTitle(),
                e.getCategory(), e.getReleaseYear(), split(e.getCountries()), genreIds, split(e.getCastNames()),
                e.getOverview(), posterUrl, e.getTmdbRating(), e.getMyRating(), e.getReview(), e.getTitleBe(),
                e.getOverviewBe(), e.getCreatedAt());
    }
}
