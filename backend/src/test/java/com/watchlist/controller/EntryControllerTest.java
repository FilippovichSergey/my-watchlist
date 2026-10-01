package com.watchlist.controller;

import com.watchlist.config.AdminAuthorityConverter;
import com.watchlist.config.ClockConfig;
import com.watchlist.config.SecurityConfig;
import com.watchlist.config.TmdbProperties;
import com.watchlist.dto.EntryResponse;
import com.watchlist.model.Category;
import com.watchlist.model.TmdbMediaType;
import com.watchlist.service.EntryService;
import com.watchlist.service.TmdbRateLimiter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.OffsetDateTime;
import java.util.List;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EntryController.class)
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
class EntryControllerTest {

    static final String ADMIN = "owner@example.com";
    static final String STRANGER = "stranger@example.com";
    static final String VALID_BODY = """
            {"tmdbId": 693134, "mediaType": "MOVIE", "category": "MOVIE", "review": "Great"}
            """;

    @Autowired MockMvc mvc;
    @Autowired AdminAuthorityConverter authorities;
    @MockitoBean EntryService service;

    /** A Google ID token as the real converter would see it, with verified e-mail claims. */
    RequestPostProcessor googleUser(String email) {
        return jwt().jwt(j -> j.subject("sub-" + email).claim("email", email).claim("email_verified", true))
                .authorities(authorities);
    }

    @Test
    void listIsPublicAndHidesReviews() throws Exception {
        given(service.findAll(false)).willReturn(List.of());
        mvc.perform(get("/api/entries")).andExpect(status().isOk());
        verify(service).findAll(false);
    }

    @Test
    void listIncludesReviewsForAdmin() throws Exception {
        mvc.perform(get("/api/entries").with(googleUser(ADMIN))).andExpect(status().isOk());
        verify(service).findAll(true);
    }

    @Test
    void createWithoutTokenIsUnauthorized() throws Exception {
        mvc.perform(post("/api/entries").contentType(APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test
    void createByOtherGoogleUserIsForbidden() throws Exception {
        mvc.perform(post("/api/entries").with(googleUser(STRANGER)).contentType(APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void createByAdminIsAllowed() throws Exception {
        given(service.create(any())).willReturn(new EntryResponse(1L, 693134, TmdbMediaType.MOVIE, "Dune: Part Two",
                Category.MOVIE, null, null, "Great", OffsetDateTime.now()));
        mvc.perform(post("/api/entries").with(googleUser(ADMIN)).contentType(APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Dune: Part Two"));
    }

    @Test
    void createRejectsInvalidInputWithFieldErrors() throws Exception {
        String body = "{\"tmdbId\": -5, \"mediaType\": \"MOVIE\", \"review\": \"" + "x".repeat(2001) + "\"}";
        mvc.perform(post("/api/entries").with(googleUser(ADMIN)).contentType(APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field", containsInAnyOrder("tmdbId", "category", "review")));
        verifyNoInteractions(service);
    }

    @Test
    void createDrawsFromTheSharedTmdbBudget() throws Exception {
        // A second allowlisted admin, so this test's quota does not leak into the others (the limiter bean is shared)
        String busyAdmin = "busy@example.com";
        given(service.create(any())).willReturn(new EntryResponse(2L, 1, TmdbMediaType.TV, "X",
                Category.SERIAL, null, null, null, OffsetDateTime.now()));
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/api/entries").with(googleUser(busyAdmin)).contentType(APPLICATION_JSON).content(VALID_BODY))
                    .andExpect(status().isCreated());
        }
        mvc.perform(post("/api/entries").with(googleUser(busyAdmin)).contentType(APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void deleteRequiresAdmin() throws Exception {
        mvc.perform(delete("/api/entries/1")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/entries/1").with(googleUser(STRANGER))).andExpect(status().isForbidden());
        mvc.perform(delete("/api/entries/1").with(googleUser(ADMIN))).andExpect(status().isNoContent());
        verify(service).delete(1L);
    }
}
