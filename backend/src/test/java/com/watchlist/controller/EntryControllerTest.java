package com.watchlist.controller;

import com.watchlist.config.AdminAuthorityConverter;
import com.watchlist.config.ClockConfig;
import com.watchlist.config.SecurityConfig;
import com.watchlist.config.TmdbProperties;
import com.watchlist.dto.EntryResponse;
import com.watchlist.model.Category;
import com.watchlist.model.TmdbMediaType;
import com.watchlist.service.EntryService;
import com.watchlist.service.RefreshJob;
import com.watchlist.service.TmdbRateLimiter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
        "auth.admin-emails=owner@example.com,busy@example.com,refresher@example.com",
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

    static EntryResponse sample(long id, String title) {
        return new EntryResponse(id, 693134, TmdbMediaType.MOVIE, title, "Dune: Part Two", Category.MOVIE, 2024,
                List.of("US"), List.of(878, 12), List.of("Timothée Chalamet", "Zendaya"), "Paul Atreides...",
                null, null, 9, "Great", OffsetDateTime.now());
    }

    @Autowired MockMvc mvc;
    @Autowired AdminAuthorityConverter authorities;
    @MockitoBean EntryService service;
    @MockitoBean RefreshJob refreshJob;

    /** A Google ID token as the real converter would see it, with verified e-mail claims. */
    RequestPostProcessor googleUser(String email) {
        return jwt().jwt(j -> j.subject("sub-" + email).claim("email", email).claim("email_verified", true))
                .authorities(authorities);
    }

    @Test
    void listAndSingleEntryArePublic() throws Exception {
        given(service.findAll()).willReturn(List.of(sample(1L, "Dune: Part Two")));
        given(service.findOne(1L)).willReturn(sample(1L, "Dune: Part Two"));
        mvc.perform(get("/api/entries")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].review").value("Great"))
                .andExpect(jsonPath("$[0].countries[0]").value("US"))
                .andExpect(jsonPath("$[0].myRating").value(9));
        mvc.perform(get("/api/entries/1")).andExpect(status().isOk())
                .andExpect(jsonPath("$.cast[1]").value("Zendaya"));
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
        given(service.create(any())).willReturn(sample(1L, "Dune: Part Two"));
        mvc.perform(post("/api/entries").with(googleUser(ADMIN)).contentType(APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Dune: Part Two"));
    }

    @Test
    void createRejectsInvalidInputWithFieldErrors() throws Exception {
        String body = "{\"tmdbId\": -5, \"mediaType\": \"MOVIE\", \"myRating\": 11, \"review\": \"" + "x".repeat(2001) + "\"}";
        mvc.perform(post("/api/entries").with(googleUser(ADMIN)).contentType(APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[*].field", containsInAnyOrder("tmdbId", "category", "myRating", "review")));
        verifyNoInteractions(service);
    }

    @Test
    void createDrawsFromTheSharedTmdbBudget() throws Exception {
        // A second allowlisted admin, so this test's quota does not leak into the others (the limiter bean is shared)
        String busyAdmin = "busy@example.com";
        given(service.create(any())).willReturn(sample(2L, "X"));
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/api/entries").with(googleUser(busyAdmin)).contentType(APPLICATION_JSON).content(VALID_BODY))
                    .andExpect(status().isCreated());
        }
        mvc.perform(post("/api/entries").with(googleUser(busyAdmin)).contentType(APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void updateIsAdminOnlyAndValidated() throws Exception {
        String body = "{\"category\": \"ANIME\", \"myRating\": 8, \"review\": \"Rewatched\"}";
        mvc.perform(patch("/api/entries/1").contentType(APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/entries/1").with(googleUser(STRANGER)).contentType(APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/entries/1").with(googleUser(ADMIN)).contentType(APPLICATION_JSON)
                        .content("{\"category\": \"ANIME\", \"myRating\": 0}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("myRating"));
        given(service.update(eq(1L), any())).willReturn(sample(1L, "Dune: Part Two"));
        mvc.perform(patch("/api/entries/1").with(googleUser(ADMIN)).contentType(APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
    }

    @Test
    void refreshIsAdminOnly() throws Exception {
        mvc.perform(post("/api/entries/1/refresh")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/entries/refresh").with(googleUser(STRANGER))).andExpect(status().isForbidden());
        // The batch progress is not public even though GET /api/entries/* is
        mvc.perform(get("/api/entries/refresh")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/entries/refresh").with(googleUser(STRANGER))).andExpect(status().isForbidden());
        verifyNoInteractions(service, refreshJob);

        // A single refresh draws from the shared TMDB budget, so it uses its own allowlisted admin here
        String refresher = "refresher@example.com";
        given(service.refresh(1L)).willReturn(sample(1L, "Dune: Part Two"));
        mvc.perform(post("/api/entries/1/refresh").with(googleUser(refresher))).andExpect(status().isOk());

        Instant startedAt = Instant.parse("2026-10-01T12:00:00Z");
        given(refreshJob.start("sub-" + refresher)).willReturn(new RefreshJob.Progress(true, 162, 0, 0, startedAt, null, null));
        given(refreshJob.progress()).willReturn(new RefreshJob.Progress(false, 162, 160, 2, startedAt, startedAt.plusSeconds(400), null));
        mvc.perform(post("/api/entries/refresh").with(googleUser(refresher))).andExpect(status().isAccepted())
                .andExpect(jsonPath("$.running").value(true))
                .andExpect(jsonPath("$.total").value(162));
        mvc.perform(get("/api/entries/refresh").with(googleUser(refresher))).andExpect(status().isOk())
                .andExpect(jsonPath("$.running").value(false))
                .andExpect(jsonPath("$.done").value(160))
                .andExpect(jsonPath("$.failed").value(2))
                .andExpect(jsonPath("$.error").value((Object) null));
    }

    @Test
    void deleteRequiresAdmin() throws Exception {
        mvc.perform(delete("/api/entries/1")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/entries/1").with(googleUser(STRANGER))).andExpect(status().isForbidden());
        mvc.perform(delete("/api/entries/1").with(googleUser(ADMIN))).andExpect(status().isNoContent());
        verify(service).delete(1L);
    }
}
