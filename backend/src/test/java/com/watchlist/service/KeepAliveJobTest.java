package com.watchlist.service;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

class KeepAliveJobTest {

    @Test
    void requestsItsOwnHealthEndpointAndSurvivesFailures() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://watchlist.example/api/health")).andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.OK));
        server.expect(requestTo("https://watchlist.example/api/health"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
        KeepAliveJob job = new KeepAliveJob(builder, "https://watchlist.example/");

        job.ping();
        job.ping(); // a failing answer is logged, not thrown: the schedule must go on

        server.verify();
    }
}
