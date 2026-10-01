package com.watchlist.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.support.HttpRequestWrapper;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

@Configuration
@EnableConfigurationProperties(TmdbProperties.class)
public class RestClientConfig {

    private static final Logger log = LoggerFactory.getLogger(RestClientConfig.class);

    /** Timeouts come from spring.http.client.* through the auto-configured builder. */
    @Bean
    public RestClient tmdbRestClient(TmdbProperties props, RestClient.Builder builder) {
        builder.baseUrl(props.baseUrl());
        if (StringUtils.hasText(props.accessToken())) {
            builder.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + props.accessToken());
        } else if (StringUtils.hasText(props.apiKey())) {
            log.warn("TMDB: using the legacy v3 api_key in the query string. Set TMDB_ACCESS_TOKEN "
                    + "(v4 read access token) to send the credential as a header instead.");
            builder.requestInterceptor(apiKeyInterceptor(props.apiKey()));
        } else {
            throw new IllegalStateException("TMDB credentials missing: set TMDB_ACCESS_TOKEN (preferred) or TMDB_API_KEY");
        }
        return builder.build();
    }

    private static ClientHttpRequestInterceptor apiKeyInterceptor(String apiKey) {
        return (request, body, execution) -> {
            URI withKey = UriComponentsBuilder.fromUri(request.getURI())
                    .queryParam("api_key", apiKey)
                    .build(true)
                    .toUri();
            return execution.execute(new HttpRequestWrapper(request) {
                @Override
                public URI getURI() {
                    return withKey;
                }
            }, body);
        };
    }
}
