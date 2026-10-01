package com.watchlist;

import com.watchlist.dto.EntryUpdateRequest;
import com.watchlist.dto.TmdbDetails;
import com.watchlist.model.Category;
import com.watchlist.model.Entry;
import com.watchlist.model.TmdbMediaType;
import com.watchlist.repository.EntryRepository;
import com.watchlist.service.EntryService;
import com.watchlist.service.TmdbService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.SoftAssertions.assertSoftly;
import static org.mockito.BDDMockito.given;

/**
 * A row has two writers, TMDB refreshes and the owner's edits, and they can overlap: two admin tabs, or an
 * edit during the minutes a bulk refresh takes. These tests run the real service and repository against
 * PostgreSQL (only TMDB is mocked, so its answer can be held back) and require that neither writer
 * undoes what the other has committed.
 */
@SpringBootTest
@Testcontainers
@ExtendWith(RequiresDocker.class)
@TestPropertySource(properties = {
        "tmdb.api-key=test-key",
        "auth.google.client-id=test-client-id",
        "auth.admin-emails=owner@example.com"
})
class EntryConcurrencyTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine");

    static final EntryUpdateRequest EDIT =
            new EntryUpdateRequest(Category.ANIME, 9, "new feedback", "Новая назва", "Новае апісанне");

    @Autowired EntryRepository repository;
    @Autowired EntryService entries;
    @Autowired PlatformTransactionManager transactions;
    @MockitoBean TmdbService tmdb;

    /** A stored title with known owner fields and no TMDB facts yet; ids far above any real TMDB id. */
    long stored(int tmdbId) {
        Entry entry = new Entry();
        entry.setTmdbId(tmdbId);
        entry.setMediaType(TmdbMediaType.MOVIE);
        entry.setCategory(Category.MOVIE);
        entry.setTitle("Stale title");
        entry.setMyRating(3);
        entry.setReview("old feedback");
        entry.setTitleBe("Старая назва");
        entry.setOverviewBe("Старое апісанне");
        return repository.saveAndFlush(entry).getId();
    }

    void assertBothWritersKept(long id) {
        Entry saved = repository.findById(id).orElseThrow();
        assertSoftly(softly -> {
            softly.assertThat(saved.getCategory()).as("owner category").isEqualTo(Category.ANIME);
            softly.assertThat(saved.getMyRating()).as("owner rating").isEqualTo(9);
            softly.assertThat(saved.getReview()).as("owner feedback").isEqualTo("new feedback");
            softly.assertThat(saved.getTitleBe()).as("Belarusian title").isEqualTo("Новая назва");
            softly.assertThat(saved.getOverviewBe()).as("Belarusian description").isEqualTo("Новае апісанне");
            softly.assertThat(saved.getTitle()).as("TMDB title").isEqualTo("Refreshed title");
            softly.assertThat(saved.getReleaseYear()).as("TMDB year").isEqualTo(2026);
            softly.assertThat(saved.getOverview()).as("TMDB overview").isEqualTo("Facts");
            softly.assertThat(saved.getTmdbRating()).as("TMDB rating").isEqualByComparingTo("8.1");
        });
    }

    @Test
    void refreshKeepsAnOwnerEditCommittedWhileTmdbIsResponding() throws Exception {
        int tmdbId = 900_100_001;
        long id = stored(tmdbId);
        CountDownLatch lookupStarted = new CountDownLatch(1);
        CountDownLatch finishLookup = new CountDownLatch(1);
        given(tmdb.details(TmdbMediaType.MOVIE, tmdbId)).willAnswer(inv -> {
            lookupStarted.countDown();
            if (!finishLookup.await(30, TimeUnit.SECONDS)) throw new IllegalStateException("test timeout");
            return new TmdbDetails(tmdbId, TmdbMediaType.MOVIE, "Refreshed title", "Original", 2026,
                    List.of("US"), List.of(18), List.of("Actor"), null, new BigDecimal("8.1"), "Facts");
        });

        var refresh = CompletableFuture.supplyAsync(() -> entries.refresh(id));
        try {
            // The refresh has read the row and is waiting for TMDB; the owner saves an edit meanwhile
            assertThat(lookupStarted.await(10, TimeUnit.SECONDS)).isTrue();
            entries.update(id, EDIT);
        } finally {
            finishLookup.countDown();
        }
        assertThat(refresh.get(15, TimeUnit.SECONDS).myRating()).as("the refresh answers with the saved edit").isEqualTo(9);

        assertBothWritersKept(id);
    }

    @Test
    void ownerEditKeepsFactsARefreshCommitsWhileTheEditWaitsForTheRow() throws Exception {
        long id = stored(900_100_002);
        CountDownLatch factsWritten = new CountDownLatch(1);
        CountDownLatch commitFacts = new CountDownLatch(1);
        // A refresh that has written its facts but not committed yet: it holds the row lock
        var refresh = CompletableFuture.runAsync(() -> new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            repository.updateFacts(id, "Refreshed title", "Original", 2026, "US", "18", "Actor", "Facts", null,
                    new BigDecimal("8.1"));
            factsWritten.countDown();
            try {
                if (!commitFacts.await(30, TimeUnit.SECONDS)) throw new IllegalStateException("test timeout");
            } catch (InterruptedException e) {
                throw new IllegalStateException(e);
            }
        }));
        assertThat(factsWritten.await(10, TimeUnit.SECONDS)).isTrue();

        var edit = CompletableFuture.supplyAsync(() -> entries.update(id, EDIT));
        try {
            // The edit started before the refresh committed and now waits for the row
            assertThatThrownBy(() -> edit.get(700, TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
        } finally {
            commitFacts.countDown();
        }
        refresh.get(15, TimeUnit.SECONDS);
        assertThat(edit.get(15, TimeUnit.SECONDS).title()).as("the edit answers with the fresh facts").isEqualTo("Refreshed title");

        assertBothWritersKept(id);
    }
}
