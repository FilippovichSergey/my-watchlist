package com.watchlist.controller;

import com.watchlist.dto.EntryRequest;
import com.watchlist.dto.EntryResponse;
import com.watchlist.service.EntryService;
import com.watchlist.service.TmdbRateLimiter;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static com.watchlist.config.SecurityConfig.ROLE_ADMIN;

@RestController
@RequestMapping("/api/entries")
public class EntryController {

    private static final GrantedAuthority ADMIN = new SimpleGrantedAuthority("ROLE_" + ROLE_ADMIN);

    private final EntryService service;
    private final TmdbRateLimiter quota;

    public EntryController(EntryService service, TmdbRateLimiter quota) {
        this.service = service;
        this.quota = quota;
    }

    /** Public. Personal review notes are included only when the caller is the signed-in admin. */
    @GetMapping
    public List<EntryResponse> getAll(Authentication authentication) {
        boolean admin = authentication != null && authentication.getAuthorities().contains(ADMIN);
        return service.findAll(admin);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EntryResponse create(@Valid @RequestBody EntryRequest request, @AuthenticationPrincipal Jwt jwt) {
        // Every create costs one TMDB lookup, so it draws from the same budget as search
        quota.acquireOrThrow(jwt.getSubject());
        return service.create(request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        service.delete(id);
    }
}
