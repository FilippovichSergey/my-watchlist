package com.watchlist.controller;

import com.watchlist.config.AdminAuthorityConverter;
import com.watchlist.config.ClockConfig;
import com.watchlist.config.SecurityConfig;
import com.watchlist.config.TmdbProperties;
import com.watchlist.dto.TmdbTitle;
import com.watchlist.model.TmdbMediaType;
import com.watchlist.service.TmdbRateLimiter;
import com.watchlist.service.TmdbService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TmdbController.class)
@Import({SecurityConfig.class, AdminAuthorityConverter.class, ApiExceptionHandler.class,
        TmdbRateLimiter.class, ClockConfig.class})
@EnableConfigurationProperties(TmdbProperties.class)
@TestPropertySource(properties = {
        "auth.google.issuer=https://accounts.google.com",
        "auth.google.jwk-set-uri=https://www.googleapis.com/oauth2/v3/certs",
        "auth.google.client-id=test-client-id",
        "auth.admin-emails=owner@example.com,busy@example.com",
        "tmdb.base-url=https://api.themoviedb.org/3",
        "tmdb.image-base-url=https://image.tmdb.org/t/p/w500",
        "tmdb.rate-limit-per-minute=2"
})
class TmdbControllerTest {

    static final String ADMIN = "owner@example.com";

    @Autowired MockMvc mvc;
    @Autowired AdminAuthorityConverter authorities;
    @MockitoBean TmdbService service;

    RequestPostProcessor googleUser(String email) {
        return jwt().jwt(j -> j.subject("sub-" + email).claim("email", email).claim("email_verified", true))
                .authorities(authorities);
    }

    @Test
    void searchWithoutTokenIsUnauthorized() throws Exception {
        mvc.perform(get("/api/tmdb/search").param("q", "dune")).andExpect(status().isUnauthorized());
    }

    @Test
    void searchByOtherGoogleUserIsForbidden() throws Exception {
        mvc.perform(get("/api/tmdb/search").param("q", "dune").with(googleUser("stranger@example.com")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void searchByAdminReturnsTrimmedQueryResults() throws Exception {
        given(service.search("dune")).willReturn(List.of(new TmdbTitle(693134, TmdbMediaType.MOVIE, "Dune: Part Two",
                "/abc.jpg", "https://image.tmdb.org/t/p/w500/abc.jpg", new BigDecimal("8.2"), "Paul")));
        mvc.perform(get("/api/tmdb/search").param("q", " dune ").with(googleUser(ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].mediaType").value("MOVIE"));
    }

    @Test
    void searchRejectsBlankAndOverlongQueries() throws Exception {
        mvc.perform(get("/api/tmdb/search").param("q", "   ").with(googleUser(ADMIN)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("q"));
        mvc.perform(get("/api/tmdb/search").param("q", "x".repeat(101)).with(googleUser(ADMIN)))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void searchIsRateLimitedPerUser() throws Exception {
        // A second allowlisted admin, so this test's quota does not leak into the others (the limiter bean is shared)
        String busyAdmin = "busy@example.com";
        given(service.search(any())).willReturn(List.of());
        for (int i = 0; i < 2; i++) {
            mvc.perform(get("/api/tmdb/search").param("q", "dune").with(googleUser(busyAdmin))).andExpect(status().isOk());
        }
        mvc.perform(get("/api/tmdb/search").param("q", "dune").with(googleUser(busyAdmin)))
                .andExpect(status().isTooManyRequests());
    }
}
