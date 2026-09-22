package com.broandbro.qrapp.service;

import com.broandbro.qrapp.config.WhatsAppOtpProperties;
import com.broandbro.qrapp.dto.LoginResponse;
import com.broandbro.qrapp.entity.PasswordResetAuthorization;
import com.broandbro.qrapp.entity.WhatsAppOtp;
import com.broandbro.qrapp.exception.OtpException;
import com.broandbro.qrapp.exception.WhatsAppDeliveryException;
import com.broandbro.qrapp.otp.OtpPurpose;
import com.broandbro.qrapp.otp.OtpStatus;
import com.broandbro.qrapp.otp.PhoneNumberNormalizer;
import com.broandbro.qrapp.repository.PasswordResetAuthorizationRepository;
import com.broandbro.qrapp.repository.UserRepository;
import com.broandbro.qrapp.repository.WhatsAppOtpRepository;
import com.broandbro.qrapp.repository.LocationRepository;
import com.broandbro.qrapp.whatsapp.WhatsAppCloudApiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

@Service
@Slf4j
public class WhatsAppOtpService {
    private final WhatsAppOtpRepository otpRepository;
    private final PasswordResetAuthorizationRepository resetAuthorizationRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final WhatsAppCloudApiClient whatsAppClient;
    private final WhatsAppOtpProperties properties;
    private final UserService userService;
    private final LocationRepository locationRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public WhatsAppOtpService(WhatsAppOtpRepository otpRepository,
                              PasswordResetAuthorizationRepository resetAuthorizationRepository,
                              UserRepository userRepository, PasswordEncoder passwordEncoder,
                              WhatsAppCloudApiClient whatsAppClient, WhatsAppOtpProperties properties,
                              UserService userService) {
        this(otpRepository, resetAuthorizationRepository, userRepository, passwordEncoder,
                whatsAppClient, properties, userService, null);
    }

    @Autowired
    public WhatsAppOtpService(WhatsAppOtpRepository otpRepository,
                              PasswordResetAuthorizationRepository resetAuthorizationRepository,
                              UserRepository userRepository, PasswordEncoder passwordEncoder,
                              WhatsAppCloudApiClient whatsAppClient, WhatsAppOtpProperties properties,
                              UserService userService, LocationRepository locationRepository) {
        this.otpRepository = otpRepository;
        this.resetAuthorizationRepository = resetAuthorizationRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.whatsAppClient = whatsAppClient;
        this.properties = properties;
        this.userService = userService;
        this.locationRepository = locationRepository;
    }

    public void requestRegistrationOtp(String rawPhone, String name, String password) {
        requestRegistrationOtp(rawPhone, name, password, null);
    }

    public void requestRegistrationOtp(String rawPhone, String name, String password, Long defaultLocationId) {
        String phone = PhoneNumberNormalizer.normalize(rawPhone);
        if (userRepository.findByPhone(phone).isPresent()) {
            throw new OtpException("phone_taken");
        }
        validateLocation(defaultLocationId);
        String passwordHash = passwordEncoder.encode(password);
        requestOtp(phone, OtpPurpose.REGISTRATION, name, passwordHash, defaultLocationId);
    }

    public void requestRegistrationOtp(String rawPhone, String name, String password,
                                       Long defaultLocationId, Long customerCompanyId) {
        String phone = PhoneNumberNormalizer.normalize(rawPhone);
        if (userRepository.findByPhone(phone).isPresent()) {
            throw new OtpException("phone_taken");
        }
        validateLocation(defaultLocationId);
        if (customerCompanyId == null) throw new OtpException("customer_company_required");
        String passwordHash = passwordEncoder.encode(password);
        requestOtp(phone, OtpPurpose.REGISTRATION, name, passwordHash, defaultLocationId, customerCompanyId);
    }

    public void requestPasswordResetOtp(String rawPhone) {
        String phone = PhoneNumberNormalizer.normalize(rawPhone);
        if (userRepository.findByPhone(phone).isEmpty()) {
            log.info("OTP_REQUESTED purpose={} eligible=false phone={}", OtpPurpose.PASSWORD_RESET,
                    PhoneNumberNormalizer.mask(phone));
            return;
        }
        requestOtp(phone, OtpPurpose.PASSWORD_RESET, null, null, null);
    }

    private void requestOtp(String phone, OtpPurpose purpose, String name, String passwordHash,
                            Long defaultLocationId) {
        requestOtp(phone, purpose, name, passwordHash, defaultLocationId, null);
    }

    private void requestOtp(String phone, OtpPurpose purpose, String name, String passwordHash,
                            Long defaultLocationId, Long customerCompanyId) {
        Instant now = Instant.now();
        WhatsAppOtpProperties.Otp limits = properties.getOtp();
        if (otpRepository.countByPhoneNumberAndCreatedAtAfter(phone, now.minus(1, ChronoUnit.HOURS))
                >= limits.getMaxRequestsPerHour()) {
            log.info("OTP_RATE_LIMITED purpose={} phone={}", purpose, PhoneNumberNormalizer.mask(phone));
            throw new OtpException("too_many_requests");
        }

        WhatsAppOtp active = otpRepository
                .findFirstByPhoneNumberAndPurposeAndStatusOrderByCreatedAtDesc(phone, purpose, OtpStatus.ACTIVE)
                .orElse(null);
        if (active != null && active.getCreatedAt().plusSeconds(limits.getResendCooldownSeconds()).isAfter(now)) {
            throw new OtpException("resend_cooldown");
        }
        otpRepository.invalidateActive(phone, purpose, OtpStatus.ACTIVE, OtpStatus.EXPIRED, now);

        String otp = String.format("%06d", secureRandom.nextInt(1_000_000));
        WhatsAppOtp record = WhatsAppOtp.builder()
                .phoneNumber(phone)
                .purpose(purpose)
                .otpHash(passwordEncoder.encode(otp))
                .registrationName(name)
                .registrationPasswordHash(passwordHash)
                .registrationDefaultLocationId(defaultLocationId)
                .registrationCustomerCompanyId(customerCompanyId)
                .expiresAt(now.plus(limits.getExpiryMinutes(), ChronoUnit.MINUTES))
                .attemptCount(0)
                .status(OtpStatus.ACTIVE)
                .build();
        record = otpRepository.save(record);
        try {
            whatsAppClient.sendAuthenticationCode(phone, otp);
            log.info("OTP_SEND_SUCCESS purpose={} phone={}", purpose, PhoneNumberNormalizer.mask(phone));
        } catch (WhatsAppDeliveryException ex) {
            record.setStatus(OtpStatus.FAILED);
            otpRepository.save(record);
            log.warn("OTP_SEND_FAILURE purpose={} phone={} status={} metaCode={}",
                    purpose, PhoneNumberNormalizer.mask(phone), ex.getStatusCode(), ex.getMetaErrorCode());
            throw ex;
        }
        log.info("OTP_REQUESTED purpose={} phone={}", purpose, PhoneNumberNormalizer.mask(phone));
    }

    @Transactional
    public LoginResponse verifyRegistrationOtp(String rawPhone, String submittedOtp) {
        String phone = PhoneNumberNormalizer.normalize(rawPhone);
        WhatsAppOtp otp = consume(phone, submittedOtp, OtpPurpose.REGISTRATION);
        if (otp.getRegistrationPasswordHash() == null) {
            throw new OtpException("invalid_otp");
        }
        validateLocation(otp.getRegistrationDefaultLocationId());
        if (otp.getRegistrationCustomerCompanyId() == null) {
            if (otp.getRegistrationDefaultLocationId() == null) {
                return userService.registerVerified(phone, otp.getRegistrationName(), otp.getRegistrationPasswordHash());
            }
            return userService.registerVerified(phone, otp.getRegistrationName(), otp.getRegistrationPasswordHash(),
                    otp.getRegistrationDefaultLocationId());
        }
        return userService.registerVerified(phone, otp.getRegistrationName(), otp.getRegistrationPasswordHash(),
                otp.getRegistrationDefaultLocationId(), otp.getRegistrationCustomerCompanyId());
    }

    @Transactional
    public String verifyPasswordResetOtp(String rawPhone, String submittedOtp) {
        String phone = PhoneNumberNormalizer.normalize(rawPhone);
        consume(phone, submittedOtp, OtpPurpose.PASSWORD_RESET);

        String rawToken = randomToken();
        PasswordResetAuthorization authorization = PasswordResetAuthorization.builder()
                .phoneNumber(phone)
                .tokenHash(hashToken(rawToken))
                .expiresAt(Instant.now().plus(properties.getOtp().getResetAuthorizationMinutes(), ChronoUnit.MINUTES))
                .build();
        resetAuthorizationRepository.save(authorization);
        log.info("OTP_VERIFICATION_SUCCESS purpose={} phone={}", OtpPurpose.PASSWORD_RESET,
                PhoneNumberNormalizer.mask(phone));
        return rawToken;
    }

    @Transactional
    public void resetPassword(String rawPhone, String rawToken, String newPassword) {
        String phone = PhoneNumberNormalizer.normalize(rawPhone);
        PasswordResetAuthorization authorization = resetAuthorizationRepository
                .findFirstByPhoneNumberAndUsedAtIsNullOrderByCreatedAtDesc(phone)
                .filter(candidate -> candidate.getExpiresAt().isAfter(Instant.now()))
                .filter(candidate -> MessageDigest.isEqual(
                        candidate.getTokenHash().getBytes(StandardCharsets.UTF_8),
                        hashToken(rawToken).getBytes(StandardCharsets.UTF_8)))
                .orElseThrow(() -> new OtpException("invalid_reset_authorization"));

        var user = userRepository.findByPhone(phone).orElseThrow(() -> new OtpException("invalid_reset_authorization"));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        authorization.setUsedAt(Instant.now());
        resetAuthorizationRepository.save(authorization);
        log.info("PASSWORD_RESET_SUCCESS phone={}", PhoneNumberNormalizer.mask(phone));
    }

    private WhatsAppOtp consume(String phone, String submittedOtp, OtpPurpose purpose) {
        WhatsAppOtp record = otpRepository
                .findFirstByPhoneNumberAndPurposeAndStatusOrderByCreatedAtDesc(phone, purpose, OtpStatus.ACTIVE)
                .orElseThrow(() -> new OtpException("invalid_or_expired_otp"));
        Instant now = Instant.now();
        if (!record.getExpiresAt().isAfter(now)) {
            record.setStatus(OtpStatus.EXPIRED);
            otpRepository.save(record);
            log.info("OTP_EXPIRED purpose={} phone={}", purpose, PhoneNumberNormalizer.mask(phone));
            throw new OtpException("invalid_or_expired_otp");
        }
        if (record.getAttemptCount() >= properties.getOtp().getMaxAttempts()) {
            record.setStatus(OtpStatus.LOCKED);
            otpRepository.save(record);
            log.info("OTP_MAX_ATTEMPTS purpose={} phone={}", purpose, PhoneNumberNormalizer.mask(phone));
            throw new OtpException("too_many_verification_attempts");
        }
        record.setAttemptCount(record.getAttemptCount() + 1);
        if (!passwordEncoder.matches(submittedOtp, record.getOtpHash())) {
            if (record.getAttemptCount() >= properties.getOtp().getMaxAttempts()) {
                record.setStatus(OtpStatus.LOCKED);
                log.info("OTP_MAX_ATTEMPTS purpose={} phone={}", purpose, PhoneNumberNormalizer.mask(phone));
            } else {
                log.info("OTP_VERIFICATION_FAILURE purpose={} phone={}", purpose, PhoneNumberNormalizer.mask(phone));
            }
            otpRepository.save(record);
            throw new OtpException(record.getStatus() == OtpStatus.LOCKED
                    ? "too_many_verification_attempts" : "invalid_otp");
        }
        record.setStatus(OtpStatus.VERIFIED);
        record.setVerifiedAt(now);
        record.setConsumedAt(now);
        otpRepository.save(record);
        return record;
    }

    private String randomToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        if (token == null || token.isBlank()) throw new OtpException("invalid_reset_authorization");
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder(64);
            for (byte value : digest) result.append(String.format("%02x", value));
            return result.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to process reset authorization", ex);
        }
    }

    private void validateLocation(Long locationId) {
        if (locationId != null && (locationRepository == null
                || locationRepository.findById(locationId)
                .filter(location -> Boolean.TRUE.equals(location.getActive())).isEmpty())) {
            throw new OtpException("location_not_found");
        }
    }
}
