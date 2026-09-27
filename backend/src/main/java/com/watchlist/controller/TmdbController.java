package com.watchlist.controller;

import com.watchlist.dto.TmdbSearchResult;
import com.watchlist.service.TmdbService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tmdb")
@RequiredArgsConstructor
public class TmdbController {

    private final TmdbService service;

    @GetMapping("/search")
    public List<TmdbSearchResult> search(@RequestParam String q) {
        return service.search(q);
    }
}
