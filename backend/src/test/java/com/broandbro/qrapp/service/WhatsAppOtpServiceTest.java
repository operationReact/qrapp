package com.broandbro.qrapp.service;

import com.broandbro.qrapp.config.WhatsAppOtpProperties;
import com.broandbro.qrapp.entity.WhatsAppOtp;
import com.broandbro.qrapp.exception.OtpException;
import com.broandbro.qrapp.otp.OtpPurpose;
import com.broandbro.qrapp.otp.OtpStatus;
import com.broandbro.qrapp.repository.PasswordResetAuthorizationRepository;
import com.broandbro.qrapp.repository.UserRepository;
import com.broandbro.qrapp.repository.WhatsAppOtpRepository;
import com.broandbro.qrapp.whatsapp.WhatsAppCloudApiClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WhatsAppOtpServiceTest {
    @Mock WhatsAppOtpRepository otpRepository;
    @Mock PasswordResetAuthorizationRepository resetRepository;
    @Mock UserRepository userRepository;
    @Mock WhatsAppCloudApiClient whatsAppClient;
    @Mock UserService userService;
    @Captor ArgumentCaptor<String> otpCaptor;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private WhatsAppOtpProperties properties;
    private WhatsAppOtpService service;

    @BeforeEach
    void setUp() {
        properties = new WhatsAppOtpProperties();
        properties.setEnabled(true);
        properties.getOtp().setExpiryMinutes(5);
        properties.getOtp().setMaxAttempts(5);
        properties.getOtp().setResendCooldownSeconds(60);
        properties.getOtp().setMaxRequestsPerHour(5);
        service = new WhatsAppOtpService(otpRepository, resetRepository, userRepository,
                passwordEncoder, whatsAppClient, properties, userService);
        lenient().when(otpRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(userRepository.findByPhone(anyString())).thenReturn(Optional.empty());
    }

    @Test
    void generatesSixDigitOtpAndPersistsOnlyHash() {
        service.requestRegistrationOtp("+91 9876543210", "A", "password");

        verify(whatsAppClient).sendAuthenticationCode(eq("+919876543210"), otpCaptor.capture());
        ArgumentCaptor<WhatsAppOtp> recordCaptor = ArgumentCaptor.forClass(WhatsAppOtp.class);
        verify(otpRepository).save(recordCaptor.capture());
        assertThat(otpCaptor.getValue()).matches("\\d{6}");
        assertThat(recordCaptor.getValue().getOtpHash()).isNotEqualTo(otpCaptor.getValue());
        assertThat(passwordEncoder.matches(otpCaptor.getValue(), recordCaptor.getValue().getOtpHash())).isTrue();
    }

    @Test
    void wrongOtpIncrementsAttemptsAndRejects() {
        WhatsAppOtp record = activeOtp(OtpPurpose.REGISTRATION, "123456");
        when(otpRepository.findFirstByPhoneNumberAndPurposeAndStatusOrderByCreatedAtDesc(
                anyString(), eq(OtpPurpose.REGISTRATION), eq(OtpStatus.ACTIVE))).thenReturn(Optional.of(record));

        assertThatThrownBy(() -> service.verifyRegistrationOtp("+919876543210", "000000"))
                .isInstanceOf(OtpException.class).hasMessage("invalid_otp");
        assertThat(record.getAttemptCount()).isEqualTo(1);
        verify(otpRepository).save(record);
    }

    @Test
    void expiredOtpCannotBeUsed() {
        WhatsAppOtp record = activeOtp(OtpPurpose.REGISTRATION, "123456");
        record.setExpiresAt(Instant.now().minusSeconds(1));
        when(otpRepository.findFirstByPhoneNumberAndPurposeAndStatusOrderByCreatedAtDesc(
                anyString(), eq(OtpPurpose.REGISTRATION), eq(OtpStatus.ACTIVE))).thenReturn(Optional.of(record));

        assertThatThrownBy(() -> service.verifyRegistrationOtp("+919876543210", "123456"))
                .isInstanceOf(OtpException.class).hasMessage("invalid_or_expired_otp");
        assertThat(record.getStatus()).isEqualTo(OtpStatus.EXPIRED);
    }

    @Test
    void fifthWrongAttemptLocksOtpAndReuseIsRejected() {
        WhatsAppOtp record = activeOtp(OtpPurpose.REGISTRATION, "123456");
        record.setAttemptCount(4);
        when(otpRepository.findFirstByPhoneNumberAndPurposeAndStatusOrderByCreatedAtDesc(
                anyString(), eq(OtpPurpose.REGISTRATION), eq(OtpStatus.ACTIVE))).thenReturn(Optional.of(record));

        assertThatThrownBy(() -> service.verifyRegistrationOtp("+919876543210", "000000"))
                .hasMessage("too_many_verification_attempts");
        assertThat(record.getStatus()).isEqualTo(OtpStatus.LOCKED);
    }

    @Test
    void purposeIsolatedOtpCannotBeUsedForReset() {
        WhatsAppOtp record = activeOtp(OtpPurpose.REGISTRATION, "123456");
        when(otpRepository.findFirstByPhoneNumberAndPurposeAndStatusOrderByCreatedAtDesc(
                anyString(), eq(OtpPurpose.PASSWORD_RESET), eq(OtpStatus.ACTIVE))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.verifyPasswordResetOtp("+919876543210", "123456"))
                .isInstanceOf(OtpException.class).hasMessage("invalid_or_expired_otp");
        verifyNoInteractions(resetRepository);
    }

    @Test
    void previousActiveOtpIsInvalidatedAndCooldownIsEnforced() {
        WhatsAppOtp active = activeOtp(OtpPurpose.REGISTRATION, "123456");
        when(otpRepository.findFirstByPhoneNumberAndPurposeAndStatusOrderByCreatedAtDesc(
                anyString(), eq(OtpPurpose.REGISTRATION), eq(OtpStatus.ACTIVE))).thenReturn(Optional.of(active));

        assertThatThrownBy(() -> service.requestRegistrationOtp("+919876543210", "A", "password"))
                .hasMessage("resend_cooldown");
        verify(otpRepository, never()).invalidateActive(anyString(), any(), any(), any(), any());
    }

    @Test
    void hourlyRateLimitBlocksNewRequest() {
        when(otpRepository.countByPhoneNumberAndCreatedAtAfter(anyString(), any())).thenReturn(5L);

        assertThatThrownBy(() -> service.requestRegistrationOtp("+919876543210", "A", "password"))
                .hasMessage("too_many_requests");
        verifyNoInteractions(whatsAppClient);
    }

    @Test
    void successfulOtpIsMarkedConsumedAndCannotBeReused() {
        WhatsAppOtp record = activeOtp(OtpPurpose.REGISTRATION, "123456");
        when(otpRepository.findFirstByPhoneNumberAndPurposeAndStatusOrderByCreatedAtDesc(
                anyString(), eq(OtpPurpose.REGISTRATION), eq(OtpStatus.ACTIVE))).thenReturn(Optional.of(record));
        when(userService.registerVerified(anyString(), any(), anyString())).thenReturn(null);

        service.verifyRegistrationOtp("+919876543210", "123456");

        assertThat(record.getStatus()).isEqualTo(OtpStatus.VERIFIED);
        assertThat(record.getConsumedAt()).isNotNull();
        verify(userService).registerVerified("+919876543210", "A", record.getRegistrationPasswordHash());
    }

    private WhatsAppOtp activeOtp(OtpPurpose purpose, String plainOtp) {
        return WhatsAppOtp.builder()
                .phoneNumber("+919876543210")
                .purpose(purpose)
                .otpHash(passwordEncoder.encode(plainOtp))
                .registrationName("A")
                .registrationPasswordHash(passwordEncoder.encode("password"))
                .expiresAt(Instant.now().plus(5, ChronoUnit.MINUTES))
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .status(OtpStatus.ACTIVE)
                .build();
    }
}
