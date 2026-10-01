package com.watchlist.service;

import com.watchlist.config.TmdbProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Sliding one-minute budget of TMDB calls per admin, shared by searches and the lookup made on every
 * create, so a runaway client cannot burn the TMDB quota. Counters live in this JVM: the backend is
 * deployed as a single instance, and a shared store would be needed before scaling out.
 */
@Component
public class TmdbRateLimiter {

    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final int limit;
    private final Clock clock;
    private final ConcurrentMap<String, Deque<Instant>> hits = new ConcurrentHashMap<>();

    public TmdbRateLimiter(TmdbProperties props, Clock clock) {
        this.limit = props.rateLimitPerMinute();
        this.clock = clock;
    }

    /** Consumes one TMDB call for the user, or answers 429. */
    public void acquireOrThrow(String key) {
        if (!tryAcquire(key)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many TMDB requests; try again in a minute");
        }
    }

    /** For background work that must not fail on a full budget: sleeps until one more call is allowed. */
    public void awaitSlot(String key) throws InterruptedException {
        while (!tryAcquire(key)) {
            Thread.sleep(Duration.ofSeconds(2));
        }
    }

    public boolean tryAcquire(String key) {
        Deque<Instant> window = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (window) {
            Instant now = clock.instant();
            Instant cutoff = now.minus(WINDOW);
            while (!window.isEmpty() && window.peekFirst().isBefore(cutoff)) {
                window.pollFirst();
            }
            if (window.size() >= limit) {
                return false;
            }
            window.addLast(now);
            return true;
        }
    }
}
