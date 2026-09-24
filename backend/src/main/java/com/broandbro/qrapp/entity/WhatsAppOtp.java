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

    @Column(name = "registration_date_of_birth")
    private java.time.LocalDate registrationDateOfBirth;

    @Column(name = "registration_special_date")
    private java.time.LocalDate registrationSpecialDate;

    @Column(name = "registration_special_date_description", length = 120)
    private String registrationSpecialDateDescription;

    @Column(name = "registration_special_day_type", length = 64)
    private String registrationSpecialDayType;

    @Column(name = "registration_special_day_custom_label", length = 120)
    private String registrationSpecialDayCustomLabel;

    @Column(name = "registration_password_hash")
    private String registrationPasswordHash;

    @Column(name = "registration_default_location_id")
    private Long registrationDefaultLocationId;

    @Column(name = "registration_customer_company_id")
    private Long registrationCustomerCompanyId;

    @Column(name = "registration_terms_accepted")
    private Boolean registrationTermsAccepted;

    @Column(name = "registration_terms_accepted_at")
    private Instant registrationTermsAcceptedAt;

    @Column(name = "registration_terms_version", length = 80)
    private String registrationTermsVersion;

    @Column(name = "registration_privacy_policy_version", length = 80)
    private String registrationPrivacyPolicyVersion;

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
