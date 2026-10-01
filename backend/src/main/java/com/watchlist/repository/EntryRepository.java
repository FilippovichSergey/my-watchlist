package com.watchlist.repository;

import com.watchlist.model.Category;
import com.watchlist.model.Entry;
import com.watchlist.model.TmdbMediaType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

public interface EntryRepository extends JpaRepository<Entry, Long> {

    List<Entry> findAllByOrderByCreatedAtDesc();

    boolean existsByMediaTypeAndTmdbId(TmdbMediaType mediaType, Integer tmdbId);

    @Query("select e.id from Entry e order by e.id")
    List<Long> findAllIds();

    /*
     * A row has two writers: TMDB refreshes and the owner's edits. Each writes only its own columns in one
     * statement, so the two may overlap (two tabs, an edit during a bulk refresh) without either undoing
     * the other. Saving a whole entity that was read earlier would write the other side's old values back.
     */

    /** @return 0 when the entry no longer exists */
    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Entry e set e.title = :title, e.originalTitle = :originalTitle, e.releaseYear = :releaseYear,
                   e.countries = :countries, e.genreIds = :genreIds, e.castNames = :castNames,
                   e.overview = :overview, e.posterPath = :posterPath, e.tmdbRating = :tmdbRating
            where e.id = :id""")
    int updateFacts(@Param("id") long id, @Param("title") String title, @Param("originalTitle") String originalTitle,
                    @Param("releaseYear") Integer releaseYear, @Param("countries") String countries,
                    @Param("genreIds") String genreIds, @Param("castNames") String castNames,
                    @Param("overview") String overview, @Param("posterPath") String posterPath,
                    @Param("tmdbRating") BigDecimal tmdbRating);

    /** @return 0 when the entry no longer exists */
    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Entry e set e.category = :category, e.myRating = :myRating, e.review = :review,
                   e.titleBe = :titleBe, e.overviewBe = :overviewBe
            where e.id = :id""")
    int updateOwnerFields(@Param("id") long id, @Param("category") Category category,
                          @Param("myRating") Integer myRating, @Param("review") String review,
                          @Param("titleBe") String titleBe, @Param("overviewBe") String overviewBe);
}
