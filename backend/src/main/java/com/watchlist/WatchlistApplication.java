package com.watchlist;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class WatchlistApplication {
    public static void main(String[] args) {
        SpringApplication.run(WatchlistApplication.class, args);
    }
}
