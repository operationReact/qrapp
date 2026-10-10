package com.broandbro.qrapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "partner")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Partner {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "partner_code", nullable = false, unique = true, length = 40)
    private String partnerCode;

    @Column(name = "legal_name", nullable = false, length = 200)
    private String legalName;

    @Column(name = "display_name", nullable = false, length = 200)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PartnerStatus status = PartnerStatus.ACTIVE;

    @Column(name = "primary_contact_name", nullable = false, length = 160)
    private String primaryContactName;

    @Column(name = "primary_contact_email", nullable = false, length = 254)
    private String primaryContactEmail;

    @Column(name = "primary_contact_phone", nullable = false, length = 20)
    private String primaryContactPhone;

    @Column(name = "alternate_contact_phone", length = 20)
    private String alternateContactPhone;

    @Column(name = "business_type", length = 100)
    private String businessType;

    @Column(name = "registered_address", columnDefinition = "TEXT")
    private String registeredAddress;

    @Column(length = 120)
    private String city;

    @Column(length = 120)
    private String state;

    @Column(length = 10)
    private String pincode;

    @Column(length = 80)
    @Builder.Default
    private String country = "India";

    @Column(name = "gst_registered", nullable = false)
    @Builder.Default
    private Boolean gstRegistered = false;

    @Column(length = 15)
    private String gstin;

    @Column(length = 10)
    private String pan;

    @Column(length = 20)
    private String tan;

    @Column(length = 20)
    private String fssai;

    @Column(name = "other_registration_details", columnDefinition = "TEXT")
    private String otherRegistrationDetails;

    @Column(name = "account_holder_name", length = 160)
    private String accountHolderName;

    @Column(name = "bank_name", length = 160)
    private String bankName;

    @Column(name = "account_number", length = 40)
    private String accountNumber;

    @Column(length = 20)
    private String ifsc;

    @Column(name = "upi_id", length = 160)
    private String upiId;

    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "created_by", length = 160)
    private String createdBy;

    @Column(name = "updated_by", length = 160)
    private String updatedBy;

    @Version
    private Long version;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (status == null) status = PartnerStatus.ACTIVE;
        if (gstRegistered == null) gstRegistered = false;
        if (country == null || country.isBlank()) country = "India";
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
