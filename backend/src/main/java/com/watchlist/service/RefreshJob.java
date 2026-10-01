package com.watchlist.service;

import com.watchlist.repository.EntryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Re-reads every title's facts from TMDB in the background, one entry at a time, paying for each
 * lookup from the admin's TMDB budget (and waiting when it is spent) instead of bypassing it.
 * Only one run exists at a time; a second request simply reports the progress of the first.
 */
@Service
public class RefreshJob {

    private static final Logger log = LoggerFactory.getLogger(RefreshJob.class);

    public record Progress(boolean running, int total, int done, int failed, Instant startedAt, Instant finishedAt) {
        static Progress idle() {
            return new Progress(false, 0, 0, 0, null, null);
        }
    }

    private final EntryRepository repository;
    private final EntryService entries;
    private final TmdbRateLimiter quota;
    private final Clock clock;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private final AtomicReference<Progress> progress = new AtomicReference<>(Progress.idle());

    public RefreshJob(EntryRepository repository, EntryService entries, TmdbRateLimiter quota, Clock clock) {
        this.repository = repository;
        this.entries = entries;
        this.quota = quota;
        this.clock = clock;
    }

    /** Starts a run unless one is in flight; either way answers the current progress. */
    public Progress start(String budgetKey) {
        if (!running.compareAndSet(false, true)) {
            return progress.get();
        }
        List<Long> ids = repository.findAllIds();
        progress.set(new Progress(true, ids.size(), 0, 0, clock.instant(), null));
        Thread.ofVirtual().name("tmdb-refresh").start(() -> run(ids, budgetKey));
        return progress.get();
    }

    public Progress progress() {
        return progress.get();
    }

    private void run(List<Long> ids, String budgetKey) {
        Instant startedAt = progress.get().startedAt();
        int done = 0;
        int failed = 0;
        try {
            for (Long id : ids) {
                quota.awaitSlot(budgetKey);
                try {
                    entries.refresh(id);
                    done++;
                } catch (ResponseStatusException e) {
                    failed++;
                    log.warn("Refresh of entry {} skipped: {}", id, e.getReason());
                }
                progress.set(new Progress(true, ids.size(), done, failed, startedAt, null));
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (RuntimeException e) {
            log.error("Refresh run aborted after {} entries", done, e);
        } finally {
            progress.set(new Progress(false, ids.size(), done, failed, startedAt, clock.instant()));
            running.set(false);
        }
    }
}
