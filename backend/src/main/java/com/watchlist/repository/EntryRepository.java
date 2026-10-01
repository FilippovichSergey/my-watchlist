package com.watchlist.repository;

import com.watchlist.model.Entry;
import com.watchlist.model.TmdbMediaType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface EntryRepository extends JpaRepository<Entry, Long> {

    List<Entry> findAllByOrderByCreatedAtDesc();

    boolean existsByMediaTypeAndTmdbId(TmdbMediaType mediaType, Integer tmdbId);

    @Query("select e.id from Entry e order by e.id")
    List<Long> findAllIds();
}
