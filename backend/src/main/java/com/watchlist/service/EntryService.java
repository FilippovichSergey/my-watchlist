package com.watchlist.service;

import com.watchlist.dto.EntryRequest;
import com.watchlist.dto.EntryResponse;
import com.watchlist.model.Entry;
import com.watchlist.repository.EntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EntryService {

    private final EntryRepository repository;

    public List<EntryResponse> findAll() {
        return repository.findAll().stream().map(EntryResponse::from).toList();
    }

    public EntryResponse create(EntryRequest req) {
        Entry entry = new Entry();
        entry.setTmdbId(req.tmdbId());
        entry.setTitle(req.title());
        entry.setCategory(req.category());
        entry.setPosterUrl(req.posterUrl());
        entry.setTmdbRating(req.tmdbRating());
        entry.setReview(req.review());
        return EntryResponse.from(repository.save(entry));
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
