package com.watchlist;

import com.watchlist.model.Category;
import com.watchlist.model.Entry;
import com.watchlist.model.TmdbMediaType;
import com.watchlist.repository.EntryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Boots the real application against a throwaway PostgreSQL: Flyway applies every migration from an
 * empty database and Hibernate validates the JPA mapping against the result, so schema/entity drift
 * fails here instead of at deployment. Skipped without Docker on a developer machine, never in CI
 * (see {@link RequiresDocker}).
 */
@SpringBootTest
@Testcontainers
@ExtendWith(RequiresDocker.class)
@TestPropertySource(properties = {
        "tmdb.api-key=test-key",
        "auth.google.client-id=test-client-id",
        "auth.admin-emails=owner@example.com"
})
class DatabaseSchemaTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine");

    /** Far above any real TMDB id, so the seed data in V2 can never collide with these rows. */
    static final int TEST_ID = 900_000_001;

    @Autowired
    EntryRepository repository;

    @Test
    void migrationsApplyAndMatchTheJpaMapping() {
        Entry saved = repository.save(entry(TmdbMediaType.TV, TEST_ID, Category.SERIAL));

        assertThat(saved.getId()).isNotNull();
        assertThat(repository.existsByMediaTypeAndTmdbId(TmdbMediaType.TV, TEST_ID)).isTrue();
        assertThat(repository.findAllByOrderByCreatedAtDesc()).extracting(Entry::getTitle).contains("Title " + TEST_ID);
    }

    @Test
    void aTmdbIdMayAppearOnceAsMovieAndOnceAsTvOnly() {
        repository.saveAndFlush(entry(TmdbMediaType.MOVIE, TEST_ID + 1, Category.MOVIE));
        repository.saveAndFlush(entry(TmdbMediaType.TV, TEST_ID + 1, Category.SERIAL));

        assertThatThrownBy(() -> repository.saveAndFlush(entry(TmdbMediaType.TV, TEST_ID + 1, Category.ANIME)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    /** V2 and V3 carry the owner's initial list; a changed or reordered import shows up here, not after deployment. */
    @Test
    void seedMigrationsLoadTheInitialWatchlistInListOrder() {
        List<Entry> seeded = repository.findAllByOrderByCreatedAtDesc().stream()
                .filter(e -> e.getTmdbId() < TEST_ID)
                .toList();
        List<String> titles = seeded.stream().map(Entry::getTitle).toList();

        assertThat(seeded).hasSize(162);
        assertThat(titles.getFirst()).isEqualTo("Undercover High School");
        assertThat(titles.getLast()).isEqualTo("Wotakoi: Love Is Hard for Otaku");
        // V3 slots its titles next to their neighbours from the list instead of on top
        assertThat(titles.indexOf("SEE HEAR LOVE")).isEqualTo(titles.indexOf("Blood: The Last Vampire") + 1);
        assertThat(seeded).extracting(Entry::getPosterPath).doesNotContainNull();
    }

    static Entry entry(TmdbMediaType type, int tmdbId, Category category) {
        Entry e = new Entry();
        e.setTmdbId(tmdbId);
        e.setMediaType(type);
        e.setCategory(category);
        e.setTitle("Title " + tmdbId);
        e.setPosterPath("/p" + tmdbId + ".jpg");
        e.setTmdbRating(new BigDecimal("8.5"));
        e.setReview("note");
        return e;
    }
}
