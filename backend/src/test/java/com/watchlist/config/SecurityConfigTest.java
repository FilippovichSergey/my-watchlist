package com.watchlist.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityConfigTest {

    static final AuthProperties.Google GOOGLE = new AuthProperties.Google(
            "https://accounts.google.com", "https://www.googleapis.com/oauth2/v3/certs", "my-client-id");

    final OAuth2TokenValidator<Jwt> validator = SecurityConfig.googleIdTokenValidator(GOOGLE);

    @Test
    void acceptsGoogleTokenIssuedForThisClient() {
        assertThat(validator.validate(token("https://accounts.google.com", "my-client-id")).hasErrors()).isFalse();
    }

    @Test
    void rejectsTokenIssuedForAnotherClient() {
        assertThat(validator.validate(token("https://accounts.google.com", "someone-elses-client")).hasErrors()).isTrue();
    }

    @Test
    void rejectsTokenFromAnotherIssuer() {
        assertThat(validator.validate(token("https://evil.example.com", "my-client-id")).hasErrors()).isTrue();
    }

    static Jwt token(String issuer, String audience) {
        Instant now = Instant.now();
        return Jwt.withTokenValue("opaque").header("alg", "RS256")
                .issuer(issuer).audience(List.of(audience)).subject("123")
                .issuedAt(now).expiresAt(now.plusSeconds(3600))
                .build();
    }
}
