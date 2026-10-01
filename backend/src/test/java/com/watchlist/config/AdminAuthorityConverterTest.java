package com.watchlist.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AdminAuthorityConverterTest {

    static final String OWNER_SUB = "109876543210987654321";

    @Test
    void grantsAdminToVerifiedAllowlistedEmailIgnoringCase() {
        assertThat(byEmail().convert(jwt("any-sub", "owner@example.com", true)))
                .extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_ADMIN");
    }

    @Test
    void ignoresUnverifiedEmail() {
        assertThat(byEmail().convert(jwt("any-sub", "owner@example.com", false))).isEmpty();
    }

    @Test
    void ignoresOtherGoogleUsers() {
        assertThat(byEmail().convert(jwt("any-sub", "stranger@example.com", true))).isEmpty();
    }

    @Test
    void ignoresTokensWithoutEmail() {
        Jwt anonymous = Jwt.withTokenValue("t").header("alg", "RS256").subject("any-sub").build();
        assertThat(byEmail().convert(anonymous)).isEmpty();
    }

    @Test
    void grantsAdminByStableSubjectEvenAfterTheEmailChanged() {
        assertThat(bySubject().convert(jwt(OWNER_SUB, "new-address@example.com", true)))
                .extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_ADMIN");
    }

    @Test
    void subjectAllowlistIgnoresTheSameEmailOnAnotherAccount() {
        assertThat(bySubject().convert(jwt("another-sub", "owner@example.com", true))).isEmpty();
    }

    @Test
    void refusesToStartWithoutAnyAdmin() {
        assertThatThrownBy(() -> new AdminAuthorityConverter(
                new AuthProperties(SecurityConfigTest.GOOGLE, List.of(" "), List.of())))
                .isInstanceOf(IllegalStateException.class);
    }

    static AdminAuthorityConverter byEmail() {
        return new AdminAuthorityConverter(
                new AuthProperties(SecurityConfigTest.GOOGLE, List.of(), List.of(" Owner@Example.com ")));
    }

    static AdminAuthorityConverter bySubject() {
        return new AdminAuthorityConverter(
                new AuthProperties(SecurityConfigTest.GOOGLE, List.of(OWNER_SUB), List.of()));
    }

    static Jwt jwt(String subject, String email, boolean verified) {
        return Jwt.withTokenValue("t").header("alg", "RS256").subject(subject)
                .claim("email", email).claim("email_verified", verified)
                .build();
    }
}
