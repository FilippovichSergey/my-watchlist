package com.watchlist.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Keeps a free hosting instance from spinning down: a request to the service's own public URL every
 * ten minutes counts as traffic. Active only where KEEPALIVE_URL (or Render's RENDER_EXTERNAL_URL,
 * see application.yml) is set, and it asks for the health endpoint, which touches no database, so a
 * serverless database still sleeps between real visits.
 */
@Component
@ConditionalOnExpression("!'${keepalive.url:}'.isBlank()")
public class KeepAliveJob {

    private static final Logger log = LoggerFactory.getLogger(KeepAliveJob.class);

    private final RestClient client;
    private final String url;

    public KeepAliveJob(RestClient.Builder builder, @Value("${keepalive.url}") String url) {
        this.client = builder.build();
        this.url = (url.endsWith("/") ? url.substring(0, url.length() - 1) : url) + "/api/health";
        log.info("Keep-alive: requesting {} every ten minutes", this.url);
    }

    @Scheduled(initialDelayString = "PT10M", fixedDelayString = "PT10M")
    public void ping() {
        try {
            client.get().uri(url).retrieve().toBodilessEntity();
        } catch (RuntimeException e) {
            log.warn("Keep-alive request failed: {}", e.getMessage());
        }
    }
}
