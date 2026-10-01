package com.watchlist.controller;

import com.watchlist.dto.TmdbTitle;
import com.watchlist.service.TmdbRateLimiter;
import com.watchlist.service.TmdbService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tmdb")
public class TmdbController {

    private final TmdbService service;
    private final TmdbRateLimiter quota;

    public TmdbController(TmdbService service, TmdbRateLimiter quota) {
        this.service = service;
        this.quota = quota;
    }

    @GetMapping("/search")
    public List<TmdbTitle> search(@RequestParam @NotBlank @Size(max = 100) String q,
                                  @AuthenticationPrincipal Jwt jwt) {
        quota.acquireOrThrow(jwt.getSubject());
        return service.search(q.trim());
    }
}
