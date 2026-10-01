package com.watchlist.service;

import com.watchlist.config.RestClientConfig;
import com.watchlist.config.TmdbProperties;
import com.watchlist.dto.TmdbTitle;
import com.watchlist.model.TmdbMediaType;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.headerDoesNotExist;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class TmdbServiceTest {

    static final String SEARCH_JSON = """
            {"page":1,"results":[
              {"id":693134,"media_type":"movie","title":"Dune: Part Two","poster_path":"/abc.jpg","vote_average":8.24,"overview":"Paul Atreides..."},
              {"id":287,"media_type":"person","name":"Brad Pitt"},
              {"id":1396,"media_type":"tv","name":"Breaking Bad","poster_path":null,"vote_average":0,"overview":"A chemistry teacher..."}
            ]}
            """;

    record Fixture(MockRestServiceServer server, TmdbService service) {}

    static TmdbProperties props(String accessToken, String apiKey) {
        return new TmdbProperties(accessToken, apiKey, "https://api.themoviedb.org/3", "https://image.tmdb.org/t/p/w500", 30);
    }

    static Fixture fixture(TmdbProperties props) {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        RestClient client = new RestClientConfig().tmdbRestClient(props, builder);
        return new Fixture(server, new TmdbService(client, props));
    }

    @Test
    void searchSendsBearerTokenAndKeepsOnlyMoviesAndTv() {
        Fixture f = fixture(props("v4-token", null));
        f.server().expect(requestTo(startsWith("https://api.themoviedb.org/3/search/multi?query=dune")))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer v4-token"))
                .andRespond(withSuccess(SEARCH_JSON, MediaType.APPLICATION_JSON));

        List<TmdbTitle> results = f.service().search("dune");

        assertThat(results).extracting(TmdbTitle::mediaType).containsExactly(TmdbMediaType.MOVIE, TmdbMediaType.TV);
        TmdbTitle dune = results.get(0);
        assertThat(dune.title()).isEqualTo("Dune: Part Two");
        assertThat(dune.posterUrl()).isEqualTo("https://image.tmdb.org/t/p/w500/abc.jpg");
        assertThat(dune.voteAverage()).isEqualByComparingTo(new BigDecimal("8.2"));
        TmdbTitle breakingBad = results.get(1);
        assertThat(breakingBad.title()).isEqualTo("Breaking Bad");
        assertThat(breakingBad.posterUrl()).isNull();
        assertThat(breakingBad.voteAverage()).as("unrated titles carry no rating").isNull();
        f.server().verify();
    }

    @Test
    void legacyApiKeyGoesInTheQueryStringOnly() {
        Fixture f = fixture(props(null, "k3y"));
        f.server().expect(requestTo(containsString("api_key=k3y")))
                .andExpect(headerDoesNotExist(HttpHeaders.AUTHORIZATION))
                .andRespond(withSuccess("{\"results\":[]}", MediaType.APPLICATION_JSON));
        assertThat(f.service().search("x")).isEmpty();
        f.server().verify();
    }

    @Test
    void detailsUsesTheMediaTypeSpecificEndpoint() {
        Fixture f = fixture(props("t", null));
        f.server().expect(requestTo("https://api.themoviedb.org/3/tv/1396?language=en-US"))
                .andRespond(withSuccess("{\"id\":1396,\"name\":\"Breaking Bad\",\"poster_path\":\"/bb.jpg\",\"vote_average\":8.92}",
                        MediaType.APPLICATION_JSON));

        TmdbTitle title = f.service().details(TmdbMediaType.TV, 1396);

        assertThat(title.mediaType()).isEqualTo(TmdbMediaType.TV);
        assertThat(title.title()).isEqualTo("Breaking Bad");
        assertThat(title.posterPath()).isEqualTo("/bb.jpg");
        assertThat(title.voteAverage()).isEqualByComparingTo(new BigDecimal("8.9"));
    }

    @Test
    void unknownTmdbIdIsReportedAsUnprocessable() {
        Fixture f = fixture(props("t", null));
        f.server().expect(requestTo(startsWith("https://api.themoviedb.org/3/movie/1?")))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));
        assertThatThrownBy(() -> f.service().details(TmdbMediaType.MOVIE, 1))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY));
    }

    @Test
    void missingCredentialsFailAtStartup() {
        assertThatThrownBy(() -> new RestClientConfig().tmdbRestClient(props(null, null), RestClient.builder()))
                .isInstanceOf(IllegalStateException.class);
    }
}
