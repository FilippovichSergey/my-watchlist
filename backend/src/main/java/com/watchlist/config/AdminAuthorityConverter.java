package com.watchlist.config;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.UnaryOperator;
import java.util.stream.Collectors;

/**
 * Grants ROLE_ADMIN to allowlisted Google accounts: by stable subject id, or by an e-mail that Google
 * has verified. Everyone else authenticates fine but holds no authorities, so write endpoints answer 403.
 */
@Component
public class AdminAuthorityConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

    private static final GrantedAuthority ADMIN = new SimpleGrantedAuthority("ROLE_" + SecurityConfig.ROLE_ADMIN);

    private final Set<String> adminSubjects;
    private final Set<String> adminEmails;

    public AdminAuthorityConverter(AuthProperties props) {
        this.adminSubjects = clean(props.adminGoogleSubs(), String::trim);
        this.adminEmails = clean(props.adminEmails(), AdminAuthorityConverter::normalizeEmail);
        if (adminSubjects.isEmpty() && adminEmails.isEmpty()) {
            throw new IllegalStateException("No admins configured: set ADMIN_GOOGLE_SUBS (preferred) or ADMIN_EMAILS");
        }
    }

    @Override
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        return isAdmin(jwt) ? List.of(ADMIN) : List.of();
    }

    private boolean isAdmin(Jwt jwt) {
        if (jwt.getSubject() != null && adminSubjects.contains(jwt.getSubject())) {
            return true;
        }
        String email = jwt.getClaimAsString("email");
        boolean verified = Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified"));
        return email != null && verified && adminEmails.contains(normalizeEmail(email));
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static Set<String> clean(List<String> values, UnaryOperator<String> normalize) {
        return values.stream()
                .filter(StringUtils::hasText)
                .map(normalize)
                .collect(Collectors.toUnmodifiableSet());
    }
}
