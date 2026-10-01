package com.watchlist.controller;

import com.watchlist.dto.EntryRequest;
import com.watchlist.dto.EntryResponse;
import com.watchlist.dto.EntryUpdateRequest;
import com.watchlist.service.EntryService;
import com.watchlist.service.RefreshJob;
import com.watchlist.service.TmdbRateLimiter;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/entries")
public class EntryController {

    private final EntryService service;
    private final TmdbRateLimiter quota;
    private final RefreshJob refreshJob;

    public EntryController(EntryService service, TmdbRateLimiter quota, RefreshJob refreshJob) {
        this.service = service;
        this.quota = quota;
        this.refreshJob = refreshJob;
    }

    /** Public. */
    @GetMapping
    public List<EntryResponse> getAll() {
        return service.findAll();
    }

    /** Public. */
    @GetMapping("/{id}")
    public EntryResponse getOne(@PathVariable long id) {
        return service.findOne(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EntryResponse create(@Valid @RequestBody EntryRequest request, @AuthenticationPrincipal Jwt jwt) {
        // Every create costs one TMDB lookup, so it draws from the same budget as search
        quota.acquireOrThrow(jwt.getSubject());
        return service.create(request);
    }

    @PatchMapping("/{id}")
    public EntryResponse update(@PathVariable long id, @Valid @RequestBody EntryUpdateRequest request) {
        return service.update(id, request);
    }

    /** Re-reads one title's facts from TMDB. */
    @PostMapping("/{id}/refresh")
    public EntryResponse refresh(@PathVariable long id, @AuthenticationPrincipal Jwt jwt) {
        quota.acquireOrThrow(jwt.getSubject());
        return service.refresh(id);
    }

    /**
     * Starts re-reading every title's facts from TMDB in the background, each lookup paid from the
     * caller's budget; answers at once with the progress, which {@link #refreshProgress()} then reports.
     */
    @PostMapping("/refresh")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public RefreshJob.Progress refreshAll(@AuthenticationPrincipal Jwt jwt) {
        return refreshJob.start(jwt.getSubject());
    }

    @GetMapping("/refresh")
    public RefreshJob.Progress refreshProgress() {
        return refreshJob.progress();
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        service.delete(id);
    }
}
