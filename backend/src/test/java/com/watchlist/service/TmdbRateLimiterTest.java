package com.watchlist.service;

import com.watchlist.config.TmdbProperties;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TmdbRateLimiterTest {

    final AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-01-01T00:00:00Z"));

    final Clock clock = new Clock() {
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now.get(); }
    };

    final TmdbRateLimiter limiter = new TmdbRateLimiter(
            new TmdbProperties(null, null, "https://api", "https://img", 2), clock);

    @Test
    void allowsUpToTheLimitWithinAMinute() {
        assertThat(limiter.tryAcquire("user")).isTrue();
        assertThat(limiter.tryAcquire("user")).isTrue();
        assertThat(limiter.tryAcquire("user")).isFalse();
    }

    @Test
    void windowSlidesAfterAMinute() {
        limiter.tryAcquire("user");
        limiter.tryAcquire("user");
        now.updateAndGet(t -> t.plus(Duration.ofSeconds(61)));
        assertThat(limiter.tryAcquire("user")).isTrue();
    }

    @Test
    void usersAreCountedIndependently() {
        limiter.tryAcquire("a");
        limiter.tryAcquire("a");
        assertThat(limiter.tryAcquire("b")).isTrue();
    }

    @Test
    void acquireOrThrowAnswers429WhenExhausted() {
        limiter.acquireOrThrow("user");
        limiter.acquireOrThrow("user");
        assertThatThrownBy(() -> limiter.acquireOrThrow("user"))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode().value()).isEqualTo(429));
    }
}
