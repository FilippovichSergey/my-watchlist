package com.watchlist.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Liveness for the hosting platform's health check and the keep-alive ping. Deliberately touches nothing:
 * a probe every few minutes must not keep the (serverless) database awake.
 */
@RestController
public class HealthController {

    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
}
