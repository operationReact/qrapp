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
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.*;

/**
 * Sign in with Apple for customers.
 *
 * Mirrors {@link GoogleCustomerAuthService}: a short-lived challenge issues a
 * nonce + state, and the exchange verifies the Apple identity token, then either
 * signs in a linked customer or returns a one-time ticket that the existing
 * WhatsApp-OTP flow consumes to link the Apple account to a verified mobile.
 *
 * Enabled only when {@code app.apple.client-ids} is configured (comma-separated
 * — the Services ID used by the web/JS flow and/or the iOS bundle id used by the
 * native flow). The identity token is verified directly (no client-secret JWT),
 * which is sufficient to authenticate the user.
 */
@Service
public class AppleCustomerAuthService {
    private static final String ISSUER = "https://appleid.apple.com";
    private static final String JWKS_URI = "https://appleid.apple.com/auth/keys";

    private final List<String> clientIds;
    private final String primaryClientId;
    private final String redirectUri;
    private final UserRepository users;
    private final UserService userService;
    private final JwtDecoder decoder;
    private final SecureRandom random = new SecureRandom();
    private final Cache<String, Boolean> nonces = Caffeine.newBuilder().maximumSize(10000)
            .expireAfterWrite(Duration.ofMinutes(5)).build();
    private final Cache<String, String> tickets = Caffeine.newBuilder().maximumSize(10000)
            .expireAfterWrite(Duration.ofMinutes(15)).build();

    public AppleCustomerAuthService(@Value("${app.apple.client-ids:}") String clientIdsCsv,
                                    @Value("${app.apple.redirect-uri:}") String redirectUri,
                                    UserRepository users, UserService userService) {
        this.clientIds = Arrays.stream(clientIdsCsv.split(","))
                .map(String::trim).filter(AppleCustomerAuthService::looksLikeAppleClientId).distinct().toList();
        this.primaryClientId = clientIds.isEmpty() ? "" : clientIds.get(0);
        this.redirectUri = redirectUri.trim();
        this.users = users;
        this.userService = userService;
        if (!enabled()) { decoder = null; return; }
        NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder.withJwkSetUri(JWKS_URI).build();
        jwtDecoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefault(), jwt -> {
            boolean valid = ISSUER.equals(jwt.getClaimAsString("iss"))
                    && jwt.getAudience() != null
                    && jwt.getAudience().stream().anyMatch(this.clientIds::contains)
                    && jwt.getExpiresAt() != null && jwt.getIssuedAt() != null
                    && jwt.getSubject() != null && !jwt.getSubject().isBlank() && jwt.getSubject().length() <= 255;
            return valid ? OAuth2TokenValidatorResult.success() :
                    OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
        }));
        decoder = jwtDecoder;
    }

    public boolean enabled() { return !clientIds.isEmpty(); }

    /**
     * Apple Services IDs and iOS bundle ids are reverse-DNS identifiers (they
     * contain a dot), e.g. {@code in.broandbro.signin}. Requiring that shape
     * means a placeholder/dummy SSM value such as {@code REPLACE_ME} does not
     * accidentally activate the flow in production — the feature stays off until
     * a real client id is configured, mirroring how the Google service only
     * enables for a {@code .apps.googleusercontent.com} client id.
     */
    private static boolean looksLikeAppleClientId(String id) {
        return id != null && id.contains(".") && id.matches("[A-Za-z0-9.-]+");
    }

    public Map<String, Object> challenge() {
        if (!enabled()) return Map.of("enabled", false);
        String nonce = randomToken();
        String state = randomToken();
        nonces.put(nonce, true);
        Map<String, Object> out = new HashMap<>();
        out.put("enabled", true);
        out.put("clientId", primaryClientId);
        out.put("nonce", nonce);
        out.put("state", state);
        out.put("scope", "name email");
        if (!redirectUri.isEmpty()) out.put("redirectUri", redirectUri);
        return out;
    }

    public Map<String, Object> exchange(String idToken, String nonce) {
        if (!enabled() || idToken == null || idToken.length() > 12000 || nonce == null
                || nonces.asMap().remove(nonce) == null) throw new OtpException("apple_sign_in_unavailable");
        Jwt jwt;
        try { jwt = decoder.decode(idToken); }
        catch (JwtException | IllegalArgumentException ex) { throw new OtpException("invalid_apple_credential"); }
        if (!nonceMatches(nonce, jwt.getClaimAsString("nonce")))
            throw new OtpException("invalid_apple_credential");
        String subject = jwt.getSubject();
        if (users.findByAppleSubject(subject).isPresent()) {
            return Map.of("status", "signed_in", "session", userService.loginVerifiedAppleCustomer(subject));
        }
        String ticket = randomToken();
        tickets.put(ticket, subject);
        return Map.of("status", "mobile_verification_required", "ticket", ticket, "name", "");
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
            throw new OtpException("apple_link_expired");
        var user = users.lockById(response.getUser().getId())
                .filter(userService::isPasswordlessCustomer)
                .orElseThrow(() -> new OtpException("apple_link_unavailable"));
        if (user.getAppleSubject() != null && !subject.equals(user.getAppleSubject()))
            throw new OtpException("apple_account_already_linked");
        if (users.findByAppleSubject(subject).filter(other -> !Objects.equals(other.getId(), user.getId())).isPresent())
            throw new OtpException("apple_account_already_linked");
        user.setAppleSubject(subject);
        users.saveAndFlush(user);
    }

    /**
     * Apple's identity token carries the nonce either verbatim (Sign in with
     * Apple JS) or as its SHA-256 hex digest (native iOS ASAuthorization).
     * Accept both so the same backend serves the web and native flows.
     */
    private boolean nonceMatches(String expected, String claim) {
        if (claim == null) return false;
        return claim.equals(expected) || claim.equalsIgnoreCase(sha256Hex(expected));
    }

    private static String sha256Hex(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) sb.append(Character.forDigit((b >> 4) & 0xf, 16))
                    .append(Character.forDigit(b & 0xf, 16));
            return sb.toString();
        } catch (Exception ex) {
            return "";
        }
    }

    private String randomToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
