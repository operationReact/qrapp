package com.broandbro.qrapp.entity;

import com.broandbro.qrapp.otp.OtpPurpose;
import com.broandbro.qrapp.otp.OtpStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "whatsapp_otp", indexes = {
        @Index(name = "idx_whatsapp_otp_phone_purpose_status", columnList = "phone_number,purpose,status"),
        @Index(name = "idx_whatsapp_otp_phone_purpose_created", columnList = "phone_number,purpose,created_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppOtp {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "phone_number", nullable = false, length = 32)
    private String phoneNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private OtpPurpose purpose;

    @Column(name = "otp_hash", nullable = false, length = 255)
    private String otpHash;

    @Column(name = "registration_name")
    private String registrationName;

    @Column(name = "registration_password_hash")
    private String registrationPasswordHash;

    @Column(name = "registration_default_location_id")
    private Long registrationDefaultLocationId;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private OtpStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
