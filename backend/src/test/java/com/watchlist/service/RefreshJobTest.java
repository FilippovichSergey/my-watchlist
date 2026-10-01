package com.watchlist.service;

import com.watchlist.config.TmdbProperties;
import com.watchlist.repository.EntryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class RefreshJobTest {

    static final String ADMIN = "sub-owner";

    final AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-01-01T00:00:00Z"));
    final Clock clock = new Clock() {
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now.get(); }
    };

    final EntryRepository repository = mock(EntryRepository.class);
    final EntryService entries = mock(EntryService.class);

    RefreshJob job(int budgetPerMinute) {
        TmdbRateLimiter limiter = new TmdbRateLimiter(
                new TmdbProperties(null, null, "https://api", "https://img", budgetPerMinute), clock);
        return new RefreshJob(repository, entries, limiter, clock);
    }

    @Test
    void refreshesEveryEntryAndCountsTheOnesTmdbRejects() {
        given(repository.findAllIds()).willReturn(List.of(1L, 2L, 3L));
        given(entries.refresh(2L)).willThrow(new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, "gone"));
        RefreshJob job = job(100);

        RefreshJob.Progress started = job.start(ADMIN);
        assertThat(started.running()).isTrue();
        assertThat(started.total()).isEqualTo(3);
        assertThat(started.startedAt()).isEqualTo(now.get());

        await().until(() -> !job.progress().running());
        RefreshJob.Progress finished = job.progress();
        assertThat(finished.done()).isEqualTo(2);
        assertThat(finished.failed()).isEqualTo(1);
        assertThat(finished.finishedAt()).isNotNull();
        verify(entries).refresh(1L);
        verify(entries).refresh(3L);
    }

    @Test
    void secondStartWhileRunningJoinsTheCurrentRun() throws Exception {
        CountDownLatch release = new CountDownLatch(1);
        given(repository.findAllIds()).willReturn(List.of(1L));
        willAnswer(inv -> { release.await(); return null; }).given(entries).refresh(1L);
        RefreshJob job = job(100);

        job.start(ADMIN);
        RefreshJob.Progress second = job.start("sub-someone-else");
        assertThat(second.running()).isTrue();
        verify(repository, times(1)).findAllIds();

        release.countDown();
        await().until(() -> !job.progress().running());
        verify(entries, times(1)).refresh(1L);
    }

    @Test
    void waitsForTheBudgetInsteadOfExceedingIt() {
        given(repository.findAllIds()).willReturn(List.of(1L, 2L, 3L));
        RefreshJob job = job(2);

        job.start(ADMIN);
        await().until(() -> job.progress().done() == 2);
        assertThat(job.progress().running()).as("third lookup must wait for the window to slide").isTrue();

        now.updateAndGet(t -> t.plus(Duration.ofSeconds(61)));
        await().atMost(Duration.ofSeconds(10)).until(() -> !job.progress().running());
        assertThat(job.progress().done()).isEqualTo(3);
    }

    @Test
    void completedRunHasNoErrorAndAccountsForEveryId() {
        given(repository.findAllIds()).willReturn(List.of(1L, 2L));
        RefreshJob job = job(100);

        job.start(ADMIN);
        await().until(() -> !job.progress().running());
        RefreshJob.Progress p = job.progress();
        assertThat(p.error()).isNull();
        assertThat(p.done() + p.failed()).isEqualTo(p.total());
    }

    @Test
    void unexpectedFailureIsReportedAsAnAbortedRun() {
        given(repository.findAllIds()).willReturn(List.of(1L, 2L, 3L));
        given(entries.refresh(2L)).willThrow(new IllegalStateException("database away"));
        RefreshJob job = job(100);

        job.start(ADMIN);
        await().until(() -> !job.progress().running());
        RefreshJob.Progress p = job.progress();
        assertThat(p.done()).isEqualTo(1);
        assertThat(p.failed()).isZero();
        assertThat(p.error()).isEqualTo("aborted: IllegalStateException");
        assertThat(p.finishedAt()).isNotNull();
        // A later start is possible again
        assertThat(job.start(ADMIN).running()).isTrue();
        await().until(() -> !job.progress().running());
    }

    @Test
    void failedStartReleasesTheLockAndIsReported() {
        given(repository.findAllIds())
                .willThrow(new IllegalStateException("database away"))
                .willReturn(List.of(1L));
        RefreshJob job = job(100);

        RefreshJob.Progress failed = job.start(ADMIN);
        assertThat(failed.running()).isFalse();
        assertThat(failed.error()).isEqualTo("could not start: IllegalStateException");
        assertThat(failed.finishedAt()).isNotNull();

        RefreshJob.Progress second = job.start(ADMIN);
        assertThat(second.running()).isTrue();
        assertThat(second.total()).isEqualTo(1);
        await().until(() -> !job.progress().running());
        assertThat(job.progress().error()).isNull();
    }

    @Test
    void concurrentStartWhileIdsLoadSeesTheNewRunNotTheOldOne() throws Exception {
        CountDownLatch loading = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        given(repository.findAllIds()).willAnswer(inv -> {
            loading.countDown();
            release.await();
            return List.of(1L);
        });
        RefreshJob job = job(100);

        CompletableFuture<RefreshJob.Progress> first = CompletableFuture.supplyAsync(() -> job.start(ADMIN));
        loading.await();
        RefreshJob.Progress meanwhile = job.start("sub-someone-else");
        assertThat(meanwhile.running()).as("the lock is taken, so the caller must see a run in progress").isTrue();
        assertThat(meanwhile.error()).isNull();

        release.countDown();
        assertThat(first.get().running()).isTrue();
        await().until(() -> !job.progress().running());
        verify(repository, times(1)).findAllIds();
    }
}
