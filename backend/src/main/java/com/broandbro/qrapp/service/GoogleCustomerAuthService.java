package com.broandbro.qrapp.service;

import com.broandbro.qrapp.dto.LoginResponse;
import com.broandbro.qrapp.exception.OtpException;
import com.broandbro.qrapp.repository.UserRepository;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.*;

@Service
public class GoogleCustomerAuthService {
    private final String clientId;
    private final UserRepository users;
    private final UserService userService;
    private final JwtDecoder decoder;
    private final SecureRandom random = new SecureRandom();
    private final Cache<String, Boolean> nonces = Caffeine.newBuilder().maximumSize(10000)
            .expireAfterWrite(Duration.ofMinutes(5)).build();
    private final Cache<String, String> tickets = Caffeine.newBuilder().maximumSize(10000)
            .expireAfterWrite(Duration.ofMinutes(15)).build();

    public GoogleCustomerAuthService(@Value("${app.google.client-id:}") String clientId,
                                     UserRepository users, UserService userService) {
        this.clientId = clientId.trim();
        this.users = users;
        this.userService = userService;
        if (!enabled()) { decoder = null; return; }
        NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder
                .withJwkSetUri("https://www.googleapis.com/oauth2/v3/certs").build();
        jwtDecoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefault(), jwt -> {
            String issuer = jwt.getClaimAsString("iss");
            String azp = jwt.getClaimAsString("azp");
            boolean valid = ("https://accounts.google.com".equals(issuer) || "accounts.google.com".equals(issuer))
                    && jwt.getAudience() != null && jwt.getAudience().contains(this.clientId)
                    && (azp == null || this.clientId.equals(azp))
                    && jwt.getExpiresAt() != null && jwt.getIssuedAt() != null
                    && jwt.getSubject() != null && !jwt.getSubject().isBlank() && jwt.getSubject().length() <= 255
                    && Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified"));
            return valid ? OAuth2TokenValidatorResult.success() :
                    OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
        }));
        decoder = jwtDecoder;
    }

    public boolean enabled() { return clientId.endsWith(".apps.googleusercontent.com"); }

    public Map<String, Object> challenge() {
        if (!enabled()) return Map.of("enabled", false);
        String nonce = randomToken();
        nonces.put(nonce, true);
        return Map.of("enabled", true, "clientId", clientId, "nonce", nonce);
    }

    public Map<String, Object> exchange(String credential, String nonce) {
        if (!enabled() || credential == null || credential.length() > 12000 || nonce == null
                || nonces.asMap().remove(nonce) == null) throw new OtpException("google_sign_in_unavailable");
        Jwt jwt;
        try { jwt = decoder.decode(credential); }
        catch (JwtException | IllegalArgumentException ex) { throw new OtpException("invalid_google_credential"); }
        if (!nonce.equals(jwt.getClaimAsString("nonce"))) throw new OtpException("invalid_google_credential");
        String subject = jwt.getSubject();
        if (users.findByGoogleSubject(subject).isPresent()) {
            return Map.of("status", "signed_in", "session", userService.loginVerifiedGoogleCustomer(subject));
        }
        String ticket = randomToken();
        tickets.put(ticket, subject);
        String name = jwt.getClaimAsString("name");
        return Map.of("status", "mobile_verification_required", "ticket", ticket, "name", name == null ? "" : name);
    }

    public void requireLinkTicket(String ticket) {
        if (ticket == null || ticket.isBlank() || tickets.getIfPresent(ticket) == null)
            throw new OtpException("google_link_expired");
    }

    /** Non-consuming check of whether this provider issued the given link ticket. */
    public boolean ownsTicket(String ticket) {
        return ticket != null && !ticket.isBlank() && tickets.getIfPresent(ticket) != null;
    }

    // Only called from a successful registration or customer-login OTP verification.
    @Transactional
    public void linkAfterOtp(LoginResponse response, String ticket) {
        if (ticket == null || ticket.isBlank()) return;
        String subject = tickets.asMap().remove(ticket);
        if (subject == null || response == null || response.getUser() == null)
            throw new OtpException("google_link_expired");
        var user = users.lockById(response.getUser().getId())
                .filter(userService::isPasswordlessCustomer)
                .orElseThrow(() -> new OtpException("google_link_unavailable"));
        if (user.getGoogleSubject() != null && !subject.equals(user.getGoogleSubject()))
            throw new OtpException("google_account_already_linked");
        if (users.findByGoogleSubject(subject).filter(other -> !Objects.equals(other.getId(), user.getId())).isPresent())
            throw new OtpException("google_account_already_linked");
        user.setGoogleSubject(subject);
        users.saveAndFlush(user);
    }

    private String randomToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
