package com.watchlist.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

import java.util.List;

/**
 * Who may mint tokens for us (Google, for our OAuth client) and who is allowed to edit the list.
 * Admins are matched by Google's stable {@code sub} claim (preferred) or by verified e-mail, which is
 * handy for the first sign-in before the subject id is known. At least one list must be non-empty;
 * {@link AdminAuthorityConverter} refuses to start otherwise.
 */
@Validated
@ConfigurationProperties(prefix = "auth")
public record AuthProperties(
        @Valid @NotNull Google google,
        @DefaultValue List<String> adminGoogleSubs,
        @DefaultValue List<String> adminEmails) {

    public record Google(@NotBlank String issuer, @NotBlank String jwkSetUri, @NotBlank String clientId) {}
}
