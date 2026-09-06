package com.broandbro.qrapp.service;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Business service for OTP flows. Does validation, normalization, rate-limiting and delegates
 * to TwoFactorClient for external calls. Uses the existing Caffeine cache named "otp" for
 * transient session storage and counters.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class TwoFactorService {

    private final TwoFactorClient client;
    private final CacheManager cacheManager;

    // Limits (sensible defaults for low-volume app)
    private final int MAX_SENDS_PER_HOUR = 5;
    private final int RESEND_COOLDOWN_SECONDS = 60;
    private final int MAX_VERIFY_ATTEMPTS = 5;

    private final Pattern INDIA_PHONE_PATTERN = Pattern.compile("^(?:\\+91|0)?([6-9][0-9]{9})$");

    public void sendOtp(String mobileRaw) throws TwoFactorException {
        String mobile = normalizeMobile(mobileRaw);
        Cache cache = cacheManager.getCache("otp");
        if (cache == null) throw new IllegalStateException("OTP cache not configured");

        OtpInfo info = cache.get(mobile, OtpInfo.class);
        if (info == null) info = new OtpInfo();

        // Rate checks
        if (info.getSendCount().get() >= MAX_SENDS_PER_HOUR && !info.isHourWindowExpired()) {
            throw new IllegalStateException("too_many_requests");
        }
        if (info.getLastSentAt() != null && Instant.now().getEpochSecond() - info.getLastSentAt().getEpochSecond() < RESEND_COOLDOWN_SECONDS) {
            throw new IllegalStateException("resend_cooldown");
        }

        // Request 2Factor
        String sessionId = client.generateOtp(mobile);

        // Update cache
        if (info.isHourWindowExpired()) {
            info.resetHourlyWindow();
        }
        info.getSendCount().incrementAndGet();
        info.setLastSentAt(Instant.now());
        info.setSessionId(sessionId);
        info.setVerifyAttempts(new AtomicInteger(0));

        cache.put(mobile, info);
    }

    public void verifyOtp(String mobileRaw, String otp) throws TwoFactorException {
        String mobile = normalizeMobile(mobileRaw);
        Cache cache = cacheManager.getCache("otp");
        if (cache == null) throw new IllegalStateException("OTP cache not configured");

        OtpInfo info = cache.get(mobile, OtpInfo.class);
        if (info == null || !StringUtils.hasText(info.getSessionId())) {
            throw new IllegalArgumentException("otp_expired_or_not_requested");
        }

        if (info.getVerifyAttempts().incrementAndGet() > MAX_VERIFY_ATTEMPTS) {
            throw new IllegalStateException("too_many_verification_attempts");
        }

        boolean ok = client.verifyOtp(info.getSessionId(), otp);
        if (!ok) {
            throw new IllegalArgumentException("invalid_otp");
        }

        // success -> remove entry
        cache.evict(mobile);
    }

    private String normalizeMobile(String raw) {
        if (raw == null) throw new IllegalArgumentException("invalid_mobile");
        String t = raw.trim();
        Matcher m = INDIA_PHONE_PATTERN.matcher(t);
        if (!m.matches()) throw new IllegalArgumentException("invalid_mobile");
        return m.group(1); // 10-digit
    }

    @Getter
    static class OtpInfo {
        private String sessionId;
        private Instant lastSentAt;
        private AtomicInteger sendCount = new AtomicInteger(0);
        private AtomicInteger verifyAttempts = new AtomicInteger(0);
        private Instant windowStart = Instant.now();

        public void setSessionId(String s) { this.sessionId = s; }
        public void setLastSentAt(Instant t) { this.lastSentAt = t; }
        public void setVerifyAttempts(AtomicInteger v) { this.verifyAttempts = v; }

        public boolean isHourWindowExpired() {
            return Instant.now().isAfter(windowStart.plusSeconds(3600));
        }

        public void resetHourlyWindow() {
            this.windowStart = Instant.now();
            this.sendCount.set(0);
        }
    }
}
