package com.watchlist.controller;

import com.watchlist.config.AdminAuthorityConverter;
import com.watchlist.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(HealthController.class)
@Import({SecurityConfig.class, AdminAuthorityConverter.class, ApiExceptionHandler.class})
@TestPropertySource(properties = {
        "auth.google.issuer=https://accounts.google.com",
        "auth.google.jwk-set-uri=https://www.googleapis.com/oauth2/v3/certs",
        "auth.google.client-id=test-client-id",
        "auth.admin-emails=owner@example.com"
})
class HealthControllerTest {

    @Autowired MockMvc mvc;

    /** The platform's health check and the keep-alive ping carry no token. */
    @Test
    void healthIsPublic() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
    }
}
